"""播放进度业务服务。"""

from datetime import UTC

from sqlalchemy.ext.asyncio import AsyncSession
from src.models.playback_progress import PlaybackProgressResponse, UpsertPlaybackProgressRequest
from src.repositories.mixed_audio_repository import MixedAudioRepository
from src.repositories.playback_progress_repository import PlaybackProgressRepository
from src.services.mix_exceptions import MixForbiddenError, MixResourceNotFoundError


def _to_response(entity: object) -> PlaybackProgressResponse:
    from src.db.models import PlaybackProgress

    assert isinstance(entity, PlaybackProgress)
    updated = entity.updated_at
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=UTC)
    return PlaybackProgressResponse(
        mixed_audio_id=entity.mixed_audio_id,
        player_context=entity.player_context,
        position_seconds=float(entity.position_seconds),
        duration_seconds=float(entity.duration_seconds)
        if entity.duration_seconds is not None
        else None,
        updated_at=updated.astimezone(UTC).isoformat(),
    )


class PlaybackProgressService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._mixed_repo = MixedAudioRepository(db)
        self._progress_repo = PlaybackProgressRepository(db)

    async def _require_asset(self, user_id: str, mixed_audio_id: str) -> None:
        asset = await self._mixed_repo.get_by_id(mixed_audio_id)
        if asset is None:
            raise MixResourceNotFoundError("组合音频不存在")
        if asset.user_id != user_id:
            raise MixForbiddenError("无权访问该资产")

    async def get_progress(
        self,
        user_id: str,
        mixed_audio_id: str,
        player_context: str,
    ) -> PlaybackProgressResponse | None:
        await self._require_asset(user_id, mixed_audio_id)
        entity = await self._progress_repo.get(user_id, mixed_audio_id, player_context)
        if entity is None:
            return None
        return _to_response(entity)

    async def save_progress(
        self,
        user_id: str,
        mixed_audio_id: str,
        body: UpsertPlaybackProgressRequest,
    ) -> PlaybackProgressResponse:
        await self._require_asset(user_id, mixed_audio_id)
        entity = await self._progress_repo.upsert(
            user_id=user_id,
            mixed_audio_id=mixed_audio_id,
            player_context=body.player_context,
            position_seconds=body.position_seconds,
            duration_seconds=body.duration_seconds,
        )
        await self._db.commit()
        return _to_response(entity)
