"""BgmSource 数据访问。"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import BgmSource


class BgmRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create(
        self,
        *,
        session_id: str,
        source_type: str,
        source_url: str | None,
        file_path: str,
        title: str,
        duration: int,
        fmt: str,
        status: str = "available",
    ) -> BgmSource:
        entity = BgmSource(
            id=str(uuid.uuid4()),
            session_id=session_id,
            source_type=source_type,
            source_url=source_url,
            file_path=file_path,
            title=title,
            duration=duration,
            format=fmt,
            status=status,
        )
        self._db.add(entity)
        await self._db.flush()
        await self._db.refresh(entity)
        return entity

    async def get_by_id(self, session_id: str, bgm_id: str) -> BgmSource | None:
        from sqlalchemy import select

        result = await self._db.execute(
            select(BgmSource).where(
                BgmSource.id == bgm_id,
                BgmSource.session_id == session_id,
            )
        )
        return result.scalar_one_or_none()
