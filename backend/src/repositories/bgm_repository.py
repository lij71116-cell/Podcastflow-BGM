"""BgmSource 数据访问。"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import BgmSource


class BgmRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self,
        *,
        user_id: str,
        source_type: str,
        source_url: str | None,
        file_path: str,
        title: str,
        duration: int,
        fmt: str,
        status: str = "available",
        cover_url: str = "",
    ) -> BgmSource:
        entity = BgmSource(
            id=str(uuid.uuid4()),
            user_id=user_id,
            session_id=None,
            source_type=source_type,
            source_url=source_url,
            file_path=file_path,
            title=title,
            cover_url=cover_url,
            duration=duration,
            format=fmt,
            status=status,
        )
        self._db.add(entity)
        await self._db.flush()
        await self._db.refresh(entity)
        return entity

    async def get_by_id(self, user_id: str, bgm_id: str) -> BgmSource | None:
        result = await self._db.execute(
            select(BgmSource).where(
                BgmSource.id == bgm_id,
                BgmSource.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def update_cover_url(self, bgm_id: str, cover_url: str) -> None:
        result = await self._db.execute(select(BgmSource).where(BgmSource.id == bgm_id))
        entity = result.scalar_one_or_none()
        if entity is None:
            return
        entity.cover_url = cover_url
        await self._db.flush()
