"""数据库模型与初始化测试（使用独立测试库）。"""

import sqlite3
from collections.abc import AsyncGenerator
from pathlib import Path

import pytest
from src.db.session import close_db, init_db, init_engine

EXPECTED_TABLES = frozenset(
    {
        "sessions",
        "podcast_sources",
        "bgm_sources",
        "mixed_audio_assets",
        "mix_tasks",
    }
)


def _list_tables(db_path: Path) -> set[str]:
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        ).fetchall()
        return {row[0] for row in rows}
    finally:
        conn.close()


@pytest.fixture()
async def isolated_db(tmp_path: Path) -> AsyncGenerator[Path, None]:
    db_path = tmp_path / "podcast_flow_test.db"
    init_engine(str(db_path))
    await init_db()
    yield db_path
    await close_db()


@pytest.mark.asyncio
async def test_all_core_tables_created(isolated_db: Path) -> None:
    tables = _list_tables(isolated_db)
    assert EXPECTED_TABLES.issubset(tables)


@pytest.mark.asyncio
async def test_podcast_source_columns(isolated_db: Path) -> None:
    conn = sqlite3.connect(str(isolated_db))
    try:
        cols = {
            row[1]
            for row in conn.execute("PRAGMA table_info(podcast_sources)").fetchall()
        }
        assert {
            "id",
            "session_id",
            "source_type",
            "source_url",
            "episode_id",
            "title",
            "podcast_name",
            "cover_url",
            "duration",
            "description",
            "audio_source_url",
            "created_at",
        }.issubset(cols)
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_mixed_audio_asset_has_mix_config(isolated_db: Path) -> None:
    conn = sqlite3.connect(str(isolated_db))
    try:
        cols = {
            row[1]
            for row in conn.execute("PRAGMA table_info(mixed_audio_assets)").fetchall()
        }
        assert "mix_config" in cols
        assert "output_file_path" in cols
    finally:
        conn.close()
