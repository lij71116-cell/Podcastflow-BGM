"""播放进度数据访问。"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import PlaybackProgress


class PlaybackProgressRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get(
        self,
        user_id: str,
        mixed_audio_id: str,
        player_context: str,
    ) -> PlaybackProgress | None:
        result = await self._db.execute(
            select(PlaybackProgress).where(
                PlaybackProgress.user_id == user_id,
                PlaybackProgress.mixed_audio_id == mixed_audio_id,
                PlaybackProgress.player_context == player_context,
            )
        )
        return result.scalar_one_or_none()

    async def upsert(
        self,
        *,
        user_id: str,
        mixed_audio_id: str,
        player_context: str,
        position_seconds: float,
        duration_seconds: float | None,
    ) -> PlaybackProgress:
        entity = await self.get(user_id, mixed_audio_id, player_context)
        now = datetime.now(tz=UTC)
        if entity is None:
            entity = PlaybackProgress(
                id=str(uuid.uuid4()),
                user_id=user_id,
                mixed_audio_id=mixed_audio_id,
                player_context=player_context,
                position_seconds=position_seconds,
                duration_seconds=int(duration_seconds) if duration_seconds is not None else None,
                updated_at=now,
            )
            self._db.add(entity)
        else:
            entity.position_seconds = position_seconds
            if duration_seconds is not None:
                entity.duration_seconds = int(duration_seconds)
            entity.updated_at = now

        await self._db.flush()
        await self._db.refresh(entity)
        return entity

    async def delete_by_mixed_audio(self, mixed_audio_id: str) -> None:
        result = await self._db.execute(
            select(PlaybackProgress).where(PlaybackProgress.mixed_audio_id == mixed_audio_id)
        )
        for entity in result.scalars().all():
            await self._db.delete(entity)
        await self._db.flush()
