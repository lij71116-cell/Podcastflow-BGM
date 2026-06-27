"""组合音频创建与任务查询业务服务。"""

import json
from datetime import UTC, datetime
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import AppSettings, get_settings
from src.core.ffmpeg import is_ffmpeg_available
from src.db.models import MixedAudioAsset, MixTask
from src.models.mixed_audio import (
    BgmBriefResponse,
    CreateMixedAudioRequest,
    CreateMixedAudioResponse,
    DeleteMixedAudioResponse,
    MixConfigDTO,
    MixedAudioAssetResponse,
    MixedAudioListResponse,
    MixTaskResponse,
    PodcastBriefResponse,
)
from src.repositories.bgm_repository import BgmRepository
from src.repositories.mixed_audio_repository import MixedAudioRepository
from src.repositories.podcast_repository import PodcastRepository
from src.services.mix_exceptions import (
    FFmpegUnavailableError,
    MixForbiddenError,
    MixResourceNotFoundError,
)
from src.services.mix_worker import schedule_mix


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC).isoformat()


def _mix_config_from_entity(raw: str) -> MixConfigDTO:
    data = json.loads(raw or "{}")
    legacy_rate = float(data.get("playback_rate", 1.0))
    return MixConfigDTO(
        podcast_volume=float(data.get("podcast_volume", 1.0)),
        podcast_playback_rate=float(
            data.get("podcast_playback_rate", legacy_rate),
        ),
        bgm_volume=float(data.get("bgm_volume", 0.15)),
        bgm_playback_rate=float(data.get("bgm_playback_rate", legacy_rate)),
        bgm_loop=bool(data.get("bgm_loop", True)),
    )


def _asset_to_response(entity: MixedAudioAsset) -> MixedAudioAssetResponse:
    podcast = entity.podcast_source
    bgm = entity.bgm_source
    return MixedAudioAssetResponse(
        id=entity.id,
        title=entity.title,
        duration=entity.duration,
        status=entity.status,
        play_url=f"/api/mixed-audios/{entity.id}/stream",
        download_enabled=False,
        created_at=_iso(entity.created_at) or "",
        updated_at=_iso(entity.updated_at) or "",
        podcast=PodcastBriefResponse(
            id=podcast.id,
            title=podcast.title,
            podcast_name=podcast.podcast_name,
            cover_url=podcast.cover_url,
            source_url=podcast.source_url,
        ),
        bgm=BgmBriefResponse(
            id=bgm.id,
            title=bgm.title,
            source_type=bgm.source_type,
            duration=bgm.duration,
        ),
        mix_config=_mix_config_from_entity(entity.mix_config),
        error_message=entity.error_message,
    )


def _task_to_response(entity: MixTask) -> MixTaskResponse:
    return MixTaskResponse(
        id=entity.id,
        mixed_audio_id=entity.mixed_audio_id,
        status=entity.status,
        progress=entity.progress,
        error_message=entity.error_message,
        started_at=_iso(entity.started_at),
        completed_at=_iso(entity.completed_at),
    )


class MixedAudioService:
    def __init__(self, db: AsyncSession, settings: AppSettings | None = None) -> None:
        self._db = db
        self._settings = settings or get_settings()
        self._podcast_repo = PodcastRepository(db)
        self._bgm_repo = BgmRepository(db)
        self._mixed_repo = MixedAudioRepository(db)

    async def create(
        self,
        session_id: str,
        body: CreateMixedAudioRequest,
    ) -> CreateMixedAudioResponse:
        podcast = await self._podcast_repo.get_by_id(session_id, body.podcast_source_id)
        bgm = await self._bgm_repo.get_by_id(session_id, body.bgm_source_id)

        if podcast is None or bgm is None or bgm.status != "available":
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        if not podcast.audio_source_url:
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        if not is_ffmpeg_available(self._settings.ffmpeg_path, self._settings.ffprobe_path):
            raise FFmpegUnavailableError("FFmpeg 不可用，请安装 FFmpeg 后重试")

        title = body.title or f"{podcast.title} - Mix"
        asset, task = await self._mixed_repo.create_with_task(
            session_id=session_id,
            podcast_source_id=podcast.id,
            bgm_source_id=bgm.id,
            title=title,
            duration=podcast.duration,
            mix_config=body.mix_config.model_dump(),
        )
        await self._db.commit()

        loaded = await self._mixed_repo.get_asset_with_relations(session_id, asset.id)
        if loaded is None:
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        schedule_mix(asset.id)

        return CreateMixedAudioResponse(
            mixed_audio=_asset_to_response(loaded),
            task=_task_to_response(task),
        )

    async def get_task(self, session_id: str, mixed_audio_id: str) -> MixTaskResponse:
        asset = await self._mixed_repo.get_asset_with_relations(session_id, mixed_audio_id)
        if asset is None:
            raise MixForbiddenError("无权访问该资产")

        task = await self._mixed_repo.get_latest_task(mixed_audio_id)
        if task is None:
            raise MixForbiddenError("无权访问该资产")

        return _task_to_response(task)

    async def list_assets(self, session_id: str) -> MixedAudioListResponse:
        entities = await self._mixed_repo.list_by_session(session_id)
        items = [_asset_to_response(entity) for entity in entities]
        return MixedAudioListResponse(items=items, total=len(items))

    async def get_detail(self, session_id: str, mixed_audio_id: str) -> MixedAudioAssetResponse:
        asset = await self._mixed_repo.get_asset_with_relations(session_id, mixed_audio_id)
        if asset is None:
            raise MixResourceNotFoundError("组合音频不存在")
        return _asset_to_response(asset)

    async def get_stream_file(self, session_id: str, mixed_audio_id: str) -> Path:
        asset = await self._mixed_repo.get_asset_with_relations(session_id, mixed_audio_id)
        if asset is None:
            raise MixResourceNotFoundError("组合音频不存在")
        if asset.status != "completed":
            raise MixForbiddenError("组合音频尚未合成完成，暂不可播放")
        if not asset.output_file_path:
            raise MixForbiddenError("组合音频尚未合成完成，暂不可播放")

        path = Path(asset.output_file_path)
        if not path.is_file():
            raise MixResourceNotFoundError("组合音频不存在")
        return path

    async def delete(self, session_id: str, mixed_audio_id: str) -> DeleteMixedAudioResponse:
        asset = await self._mixed_repo.delete_by_session(session_id, mixed_audio_id)
        if asset is None:
            raise MixResourceNotFoundError("组合音频不存在")

        output_path = asset.output_file_path
        await self._db.commit()

        if output_path:
            path = Path(output_path)
            if path.is_file():
                path.unlink()

        return DeleteMixedAudioResponse(deleted=True, id=mixed_audio_id)
