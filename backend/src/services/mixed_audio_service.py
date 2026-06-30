"""组合音频创建与任务查询业务服务。"""

import json
from datetime import UTC, datetime, time
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import AppSettings, get_settings
from src.core.ffmpeg import is_ffmpeg_available
from src.db.models import MixedAudioAsset, MixTask
from src.models.mixed_audio import (
    BatchDeleteMixedAudiosResponse,
    BgmBriefResponse,
    CreateMixedAudioRequest,
    CreateMixedAudioResponse,
    DeleteMixedAudioResponse,
    MixConfigDTO,
    MixedAudioAssetResponse,
    MixedAudioListResponse,
    MixTaskResponse,
    PodcastBriefResponse,
    RegenerateMixedAudioRequest,
)
from src.repositories.bgm_repository import BgmRepository
from src.repositories.mixed_audio_repository import MixedAudioRepository
from src.repositories.podcast_repository import PodcastRepository
from src.services.mix_exceptions import (
    FFmpegUnavailableError,
    MixForbiddenError,
    MixInProgressError,
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
        fade_in=int(data.get("fade_in", 0) or 0),
        fade_out=int(data.get("fade_out", 0) or 0),
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
            description=podcast.description or "",
        ),
        bgm=BgmBriefResponse(
            id=bgm.id,
            title=bgm.title,
            source_type=bgm.source_type,
            duration=bgm.duration,
            cover_url=bgm.cover_url,
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


def _parse_date_range(
    *,
    created_date: str | None,
    created_from: str | None,
    created_to: str | None,
) -> tuple[datetime | None, datetime | None]:
    """解析列表日期筛选为 UTC 起止时间。"""
    if created_date:
        day = datetime.fromisoformat(created_date).date()
        start = datetime.combine(day, time.min, tzinfo=UTC)
        end = datetime.combine(day, time.max, tzinfo=UTC)
        return start, end

    parsed_start: datetime | None = None
    parsed_end: datetime | None = None
    if created_from:
        day = datetime.fromisoformat(created_from).date()
        parsed_start = datetime.combine(day, time.min, tzinfo=UTC)
    if created_to:
        day = datetime.fromisoformat(created_to).date()
        parsed_end = datetime.combine(day, time.max, tzinfo=UTC)
    return parsed_start, parsed_end


class MixedAudioService:
    def __init__(self, db: AsyncSession, settings: AppSettings | None = None) -> None:
        self._db = db
        self._settings = settings or get_settings()
        self._podcast_repo = PodcastRepository(db)
        self._bgm_repo = BgmRepository(db)
        self._mixed_repo = MixedAudioRepository(db)

    async def _require_asset(self, user_id: str, mixed_audio_id: str) -> MixedAudioAsset:
        raw = await self._mixed_repo.get_by_id(mixed_audio_id)
        if raw is None:
            raise MixResourceNotFoundError("组合音频不存在")
        if raw.user_id != user_id:
            raise MixForbiddenError("无权访问该资产")
        asset = await self._mixed_repo.get_asset_with_relations(user_id, mixed_audio_id)
        if asset is None:
            raise MixResourceNotFoundError("组合音频不存在")
        return asset

    async def create(
        self,
        user_id: str,
        body: CreateMixedAudioRequest,
    ) -> CreateMixedAudioResponse:
        podcast = await self._podcast_repo.get_by_id(user_id, body.podcast_source_id)
        bgm = await self._bgm_repo.get_by_id(user_id, body.bgm_source_id)

        if podcast is None or bgm is None or bgm.status != "available":
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        if not podcast.audio_source_url:
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        if not is_ffmpeg_available(self._settings.ffmpeg_path, self._settings.ffprobe_path):
            raise FFmpegUnavailableError("FFmpeg 不可用，请安装 FFmpeg 后重试")

        title = body.title or f"{podcast.title} - Mix"
        asset, task = await self._mixed_repo.create_with_task(
            user_id=user_id,
            podcast_source_id=podcast.id,
            bgm_source_id=bgm.id,
            title=title,
            duration=podcast.duration,
            mix_config=body.mix_config.model_dump(),
        )
        await self._db.commit()

        loaded = await self._mixed_repo.get_asset_with_relations(user_id, asset.id)
        if loaded is None:
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        schedule_mix(asset.id)

        return CreateMixedAudioResponse(
            mixed_audio=_asset_to_response(loaded),
            task=_task_to_response(task),
        )

    async def regenerate(
        self,
        user_id: str,
        mixed_audio_id: str,
        body: RegenerateMixedAudioRequest,
    ) -> CreateMixedAudioResponse:
        asset = await self._require_asset(user_id, mixed_audio_id)

        if asset.status in ("pending", "mixing"):
            raise MixInProgressError("合成进行中，请勿重复提交")

        bgm_id = body.bgm_id or asset.bgm_source_id
        bgm = await self._bgm_repo.get_by_id(user_id, bgm_id)
        if bgm is None or bgm.status != "available":
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        podcast = asset.podcast_source
        if not podcast.audio_source_url:
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        if not is_ffmpeg_available(self._settings.ffmpeg_path, self._settings.ffprobe_path):
            raise FFmpegUnavailableError("FFmpeg 不可用，请安装 FFmpeg 后重试")

        task = await self._mixed_repo.regenerate_with_task(
            asset,
            mix_config=body.mix_config.model_dump(),
            bgm_source_id=bgm_id if body.bgm_id else None,
        )
        await self._db.commit()

        loaded = await self._mixed_repo.get_asset_with_relations(user_id, mixed_audio_id)
        if loaded is None:
            raise MixResourceNotFoundError("组合音频不存在")

        schedule_mix(mixed_audio_id)

        return CreateMixedAudioResponse(
            mixed_audio=_asset_to_response(loaded),
            task=_task_to_response(task),
        )

    async def get_task(self, user_id: str, mixed_audio_id: str) -> MixTaskResponse:
        await self._require_asset(user_id, mixed_audio_id)

        task = await self._mixed_repo.get_latest_task(mixed_audio_id)
        if task is None:
            raise MixResourceNotFoundError("组合音频不存在")

        return _task_to_response(task)

    async def list_assets(
        self,
        user_id: str,
        *,
        page: int = 1,
        page_size: int = 10,
        q: str | None = None,
        created_date: str | None = None,
        created_from: str | None = None,
        created_to: str | None = None,
    ) -> MixedAudioListResponse:
        safe_page = max(1, page)
        safe_page_size = min(50, max(1, page_size))
        range_start, range_end = _parse_date_range(
            created_date=created_date,
            created_from=created_from,
            created_to=created_to,
        )
        entities, total = await self._mixed_repo.list_by_user(
            user_id,
            page=safe_page,
            page_size=safe_page_size,
            q=q,
            created_from=range_start,
            created_to=range_end,
        )
        items = [_asset_to_response(entity) for entity in entities]
        return MixedAudioListResponse(
            items=items,
            total=total,
            page=safe_page,
            page_size=safe_page_size,
        )

    async def get_detail(self, user_id: str, mixed_audio_id: str) -> MixedAudioAssetResponse:
        asset = await self._require_asset(user_id, mixed_audio_id)
        return _asset_to_response(asset)

    async def get_stream_file(self, user_id: str, mixed_audio_id: str) -> Path:
        asset = await self._require_asset(user_id, mixed_audio_id)
        if asset.status != "completed":
            raise MixForbiddenError("组合音频尚未合成完成，暂不可播放")
        if not asset.output_file_path:
            raise MixForbiddenError("组合音频尚未合成完成，暂不可播放")

        path = Path(asset.output_file_path)
        if not path.is_file():
            raise MixResourceNotFoundError("组合音频不存在")
        return path

    async def delete(self, user_id: str, mixed_audio_id: str) -> DeleteMixedAudioResponse:
        raw = await self._mixed_repo.get_by_id(mixed_audio_id)
        if raw is None:
            raise MixResourceNotFoundError("组合音频不存在")
        if raw.user_id != user_id:
            raise MixForbiddenError("无权访问该资产")

        asset = await self._mixed_repo.delete_by_user(user_id, mixed_audio_id)
        if asset is None:
            raise MixResourceNotFoundError("组合音频不存在")

        output_path = asset.output_file_path
        await self._db.commit()

        if output_path:
            path = Path(output_path)
            if path.is_file():
                path.unlink()

        return DeleteMixedAudioResponse(deleted=True, id=mixed_audio_id)

    async def delete_batch(
        self,
        user_id: str,
        ids: list[str],
    ) -> BatchDeleteMixedAudiosResponse:
        unique_ids = list(dict.fromkeys(ids))
        deleted_ids: list[str] = []
        files_to_remove: list[Path] = []

        for mixed_audio_id in unique_ids:
            raw = await self._mixed_repo.get_by_id(mixed_audio_id)
            if raw is None or raw.user_id != user_id:
                continue

            asset = await self._mixed_repo.delete_by_user(user_id, mixed_audio_id)
            if asset is None:
                continue

            deleted_ids.append(mixed_audio_id)
            if asset.output_file_path:
                files_to_remove.append(Path(asset.output_file_path))

        await self._db.commit()

        for path in files_to_remove:
            if path.is_file():
                path.unlink()

        return BatchDeleteMixedAudiosResponse(
            deleted_count=len(deleted_ids),
            deleted_ids=deleted_ids,
        )
