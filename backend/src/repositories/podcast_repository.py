"""PodcastSource 数据访问。"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import PodcastSource
from src.services.xiaoyuzhou_parser_service import ParsedEpisode


class PodcastRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_from_parsed(
        self,
        session_id: str,
        parsed: ParsedEpisode,
    ) -> PodcastSource:
        entity = PodcastSource(
            id=str(uuid.uuid4()),
            session_id=session_id,
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

    async def get_by_id(self, session_id: str, podcast_id: str) -> PodcastSource | None:
        from sqlalchemy import select

        result = await self._db.execute(
            select(PodcastSource).where(
                PodcastSource.id == podcast_id,
                PodcastSource.session_id == session_id,
            )
        )
        return result.scalar_one_or_none()
