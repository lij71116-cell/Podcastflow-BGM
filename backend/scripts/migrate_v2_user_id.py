"""V2 用户隔离迁移：为业务表添加 user_id 列，并将 session_id 改为可空。

V1 匿名 Session 数据不合并到新用户（user_id 保持 NULL）。

用法：
    cd backend && PYTHONPATH=..:. python scripts/migrate_v2_user_id.py
"""

import asyncio
import sqlite3
import sys
from pathlib import Path

from src.core.config import load_settings


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row[1] == column for row in rows)


def _session_id_nullable(conn: sqlite3.Connection, table: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    for row in rows:
        if row[1] == "session_id":
            return row[3] == 0
    return True


def _relax_session_id_nullable(conn: sqlite3.Connection, table: str) -> None:
    if _session_id_nullable(conn, table):
        print(f"[migrate] {table}.session_id already nullable")
        return

    print(f"[migrate] Rebuilding {table} to allow NULL session_id")
    conn.execute(f"ALTER TABLE {table} RENAME TO {table}_old")
    if table == "podcast_sources":
        conn.execute(
            """
            CREATE TABLE podcast_sources (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                user_id VARCHAR(36),
                session_id VARCHAR(36),
                source_type VARCHAR(32) NOT NULL,
                source_url VARCHAR(2048) NOT NULL,
                episode_id VARCHAR(128) NOT NULL,
                title VARCHAR(512) NOT NULL,
                podcast_name VARCHAR(256) NOT NULL,
                cover_url VARCHAR(2048) NOT NULL,
                duration INTEGER NOT NULL,
                description TEXT,
                audio_source_url VARCHAR(2048) NOT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users (id),
                FOREIGN KEY(session_id) REFERENCES sessions (session_id)
            )
            """
        )
        conn.execute(
            """
            INSERT INTO podcast_sources (
                id, user_id, session_id, source_type, source_url, episode_id,
                title, podcast_name, cover_url, duration, description,
                audio_source_url, created_at
            )
            SELECT
                id, user_id, session_id, source_type, source_url, episode_id,
                title, podcast_name, cover_url, duration, description,
                audio_source_url, created_at
            FROM podcast_sources_old
            """
        )
    elif table == "bgm_sources":
        conn.execute(
            """
            CREATE TABLE bgm_sources (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                user_id VARCHAR(36),
                session_id VARCHAR(36),
                source_type VARCHAR(16) NOT NULL,
                source_url VARCHAR(2048),
                file_path VARCHAR(1024) NOT NULL,
                title VARCHAR(256) NOT NULL,
                duration INTEGER NOT NULL,
                format VARCHAR(16) NOT NULL,
                status VARCHAR(16) NOT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users (id),
                FOREIGN KEY(session_id) REFERENCES sessions (session_id)
            )
            """
        )
        conn.execute(
            """
            INSERT INTO bgm_sources (
                id, user_id, session_id, source_type, source_url, file_path,
                title, duration, format, status, created_at
            )
            SELECT
                id, user_id, session_id, source_type, source_url, file_path,
                title, duration, format, status, created_at
            FROM bgm_sources_old
            """
        )
    elif table == "mixed_audio_assets":
        conn.execute(
            """
            CREATE TABLE mixed_audio_assets (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                user_id VARCHAR(36),
                session_id VARCHAR(36),
                podcast_source_id VARCHAR(36) NOT NULL,
                bgm_source_id VARCHAR(36) NOT NULL,
                title VARCHAR(512) NOT NULL,
                duration INTEGER NOT NULL,
                mix_config TEXT NOT NULL,
                status VARCHAR(16) NOT NULL,
                output_file_path VARCHAR(1024),
                error_message TEXT,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users (id),
                FOREIGN KEY(session_id) REFERENCES sessions (session_id),
                FOREIGN KEY(podcast_source_id) REFERENCES podcast_sources (id),
                FOREIGN KEY(bgm_source_id) REFERENCES bgm_sources (id)
            )
            """
        )
        conn.execute(
            """
            INSERT INTO mixed_audio_assets (
                id, user_id, session_id, podcast_source_id, bgm_source_id,
                title, duration, mix_config, status, output_file_path,
                error_message, created_at, updated_at
            )
            SELECT
                id, user_id, session_id, podcast_source_id, bgm_source_id,
                title, duration, mix_config, status, output_file_path,
                error_message, created_at, updated_at
            FROM mixed_audio_assets_old
            """
        )
    else:
        raise ValueError(f"Unsupported table: {table}")

    conn.execute(f"DROP TABLE {table}_old")
    conn.execute(f"CREATE INDEX IF NOT EXISTS ix_{table}_session_id ON {table} (session_id)")
    conn.execute(f"CREATE INDEX IF NOT EXISTS ix_{table}_user_id ON {table} (user_id)")


def _migrate_sqlite(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    try:
        tables = ("podcast_sources", "bgm_sources", "mixed_audio_assets")
        for table in tables:
            if not _column_exists(conn, table, "user_id"):
                conn.execute(f"ALTER TABLE {table} ADD COLUMN user_id VARCHAR(36)")
                print(f"[migrate] Added user_id to {table}")
            else:
                print(f"[migrate] user_id already exists on {table}")

            index_name = f"ix_{table}_user_id"
            conn.execute(
                f"CREATE INDEX IF NOT EXISTS {index_name} ON {table} (user_id)"
            )

        for table in tables:
            _relax_session_id_nullable(conn, table)

        conn.commit()
        print("[migrate] Done.")
    finally:
        conn.close()


async def _async_migrate() -> None:
    settings = load_settings()
    db_path = settings.database_path
    print(f"[migrate] Target database: {db_path}")
    _migrate_sqlite(db_path)


def main() -> None:
    asyncio.run(_async_migrate())


if __name__ == "__main__":
    main()
    sys.exit(0)
