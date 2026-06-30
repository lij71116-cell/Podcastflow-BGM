"""PodcastSource 数据访问。"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import PodcastSource
from src.services.xiaoyuzhou_parser_service import ParsedEpisode


class PodcastRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_from_parsed(
        self,
        user_id: str,
        parsed: ParsedEpisode,
    ) -> PodcastSource:
        entity = PodcastSource(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=None,
            source_type="xiaoyuzhou_episode",
            source_url=parsed.source_url,
            episode_id=parsed.episode_id,
            title=parsed.title,
            podcast_name=parsed.podcast_name,
            cover_url=parsed.cover_url,
            duration=parsed.duration,
            description=parsed.description or None,
            audio_source_url=parsed.audio_source_url,
        )
        self._db.add(entity)
        await self._db.flush()
        await self._db.refresh(entity)
        return entity

    async def update_cover_url(self, podcast_id: str, cover_url: str) -> None:
        result = await self._db.execute(
            select(PodcastSource).where(PodcastSource.id == podcast_id)
        )
        entity = result.scalar_one()
        entity.cover_url = cover_url
        await self._db.flush()

    async def get_by_id(self, user_id: str, podcast_id: str) -> PodcastSource | None:
        result = await self._db.execute(
            select(PodcastSource).where(
                PodcastSource.id == podcast_id,
                PodcastSource.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()
