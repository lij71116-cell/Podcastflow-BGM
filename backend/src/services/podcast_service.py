"""播客解析业务服务。"""

from sqlalchemy.ext.asyncio import AsyncSession
from src.models.podcast import PodcastSourceResponse
from src.repositories.podcast_repository import PodcastRepository
from src.services.podcast_exceptions import PodcastNotFoundError
from src.services.xiaoyuzhou_parser_service import XiaoyuzhouParserService


def _to_response(entity: object) -> PodcastSourceResponse:
    from src.db.models import PodcastSource

    assert isinstance(entity, PodcastSource)
    return PodcastSourceResponse(
        id=entity.id,
        source_type="xiaoyuzhou_episode",
        source_url=entity.source_url,
        episode_id=entity.episode_id,
        title=entity.title,
        podcast_name=entity.podcast_name,
        cover_url=entity.cover_url,
        duration=entity.duration,
        description=entity.description or "",
        created_at=entity.created_at.isoformat(),
    )


class PodcastService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._parser = XiaoyuzhouParserService()
        self._repo = PodcastRepository(db)

    async def parse_and_save(self, session_id: str, source_url: str) -> PodcastSourceResponse:
        parsed = await self._parser.parse(source_url)
        entity = await self._repo.create_from_parsed(session_id, parsed)
        await self._db.commit()
        return _to_response(entity)

    async def get_audio_source_url(self, session_id: str, podcast_id: str) -> str:
        entity = await self._repo.get_by_id(session_id, podcast_id)
        if entity is None or not entity.audio_source_url:
            raise PodcastNotFoundError("播客资源不存在")
        return entity.audio_source_url

    async def get_source_url(self, session_id: str, podcast_id: str) -> str:
        entity = await self._repo.get_by_id(session_id, podcast_id)
        if entity is None:
            raise PodcastNotFoundError("播客资源不存在")
        return entity.source_url
