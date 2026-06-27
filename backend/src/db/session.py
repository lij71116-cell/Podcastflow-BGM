"""
数据库会话管理。

基于 pycore/integrations/db/session.py 模板扩展，
从 src.core.config 读取 database_path，不使用 pycore 模板默认引擎。
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from pycore.core.logger import get_logger
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

logger = get_logger()

_engine: AsyncEngine | None = None
_async_session_maker: async_sessionmaker[AsyncSession] | None = None


def init_engine(database_path: str) -> None:
    """初始化数据库引擎。"""
    global _engine, _async_session_maker  # noqa: PLW0603

    db_path = Path(database_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)

    database_url = f"sqlite+aiosqlite:///{db_path}"
    _engine = create_async_engine(database_url, echo=False, future=True)
    _async_session_maker = async_sessionmaker(
        _engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    logger.info("Database engine initialized", db_path=str(db_path))


def get_engine() -> AsyncEngine:
    if _engine is None:
        raise RuntimeError("Database engine not initialized. Call init_engine() first.")
    return _engine


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Depends 用数据库会话。"""
    if _async_session_maker is None:
        raise RuntimeError("Database not initialized. Call init_engine() first.")
    async with _async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    if _async_session_maker is None:
        raise RuntimeError("Database not initialized. Call init_engine() first.")
    async with _async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """创建全部业务表。"""
    from src.db.models import Base

    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


async def close_db() -> None:
    if _engine is not None:
        await _engine.dispose()
        logger.info("Database connection closed")
