"""创建 playback_progress 表。

用法：
    cd backend && PYTHONPATH=..:. python scripts/migrate_playback_progress.py
"""

import sqlite3
import sys
from pathlib import Path

from src.core.config import load_settings


def migrate(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA foreign_keys=ON")
        exists = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='playback_progress'"
        ).fetchone()
        if exists:
            print("[migrate] playback_progress already exists")
            return

        print("[migrate] Creating playback_progress table")
        conn.execute(
            """
            CREATE TABLE playback_progress (
                id VARCHAR(36) NOT NULL PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                mixed_audio_id VARCHAR(36) NOT NULL,
                player_context VARCHAR(16) NOT NULL,
                position_seconds FLOAT NOT NULL DEFAULT 0,
                duration_seconds INTEGER,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users (id),
                FOREIGN KEY(mixed_audio_id) REFERENCES mixed_audio_assets (id) ON DELETE CASCADE,
                CONSTRAINT uq_playback_progress_user_asset_ctx
                    UNIQUE (user_id, mixed_audio_id, player_context)
            )
            """
        )
        conn.execute(
            "CREATE INDEX ix_playback_progress_mixed_audio_id ON playback_progress (mixed_audio_id)"
        )
        conn.execute("CREATE INDEX ix_playback_progress_user_id ON playback_progress (user_id)")
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
