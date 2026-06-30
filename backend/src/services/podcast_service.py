"""播客解析业务服务。"""

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import AppSettings, get_settings
from src.core.cover_cache import cover_api_path, download_podcast_cover, resolve_cover_file
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
    def __init__(self, db: AsyncSession, settings: AppSettings | None = None) -> None:
        self._db = db
        self._settings = settings or get_settings()
        self._parser = XiaoyuzhouParserService()
        self._repo = PodcastRepository(db)

    async def parse_and_save(self, user_id: str, source_url: str) -> PodcastSourceResponse:
        parsed = await self._parser.parse(source_url)
        entity = await self._repo.create_from_parsed(user_id, parsed)

        if parsed.cover_url:
            saved = await download_podcast_cover(
                self._settings.storage_root,
                entity.id,
                parsed.cover_url,
            )
            if saved is not None:
                await self._repo.update_cover_url(entity.id, cover_api_path(entity.id))
                entity.cover_url = cover_api_path(entity.id)

        await self._db.commit()
        await self._db.refresh(entity)
        return _to_response(entity)

    async def get_audio_source_url(self, user_id: str, podcast_id: str) -> str:
        entity = await self._repo.get_by_id(user_id, podcast_id)
        if entity is None or not entity.audio_source_url:
            raise PodcastNotFoundError("播客资源不存在")
        return entity.audio_source_url

    async def get_source_url(self, user_id: str, podcast_id: str) -> str:
        entity = await self._repo.get_by_id(user_id, podcast_id)
        if entity is None:
            raise PodcastNotFoundError("播客资源不存在")
        return entity.source_url

    async def get_cover_file(self, user_id: str, podcast_id: str) -> Path:
        entity = await self._repo.get_by_id(user_id, podcast_id)
        if entity is None:
            raise PodcastNotFoundError("播客资源不存在")
        path = resolve_cover_file(self._settings.storage_root, podcast_id)
        if path is None or not path.is_file():
            raise PodcastNotFoundError("播客封面不存在")
        return path
