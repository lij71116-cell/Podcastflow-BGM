"""为 bgm_sources 表添加 cover_url 列。

用法：
    cd backend && PYTHONPATH=..:. python scripts/migrate_bgm_cover_url.py
"""

import sqlite3
import sys
from pathlib import Path

from src.core.config import load_settings


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(row[1] == column for row in rows)


def migrate(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    try:
        if _column_exists(conn, "bgm_sources", "cover_url"):
            print("[migrate] bgm_sources.cover_url already exists")
            return

        print("[migrate] Adding bgm_sources.cover_url")
        conn.execute(
            "ALTER TABLE bgm_sources ADD COLUMN cover_url VARCHAR(2048) NOT NULL DEFAULT ''"
        )
        conn.commit()
        print("[migrate] Done")
    finally:
        conn.close()


def main() -> None:
    settings = load_settings()
    db_path = Path(settings.database_path)
    if not db_path.is_file():
        print(f"[migrate] Database not found: {db_path}", file=sys.stderr)
        sys.exit(1)
    migrate(db_path)


if __name__ == "__main__":
    main()
