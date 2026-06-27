"""
初始化 SQLite 数据库与存储目录。

用法：
    cd backend && PYTHONPATH=..:. python scripts/init_db.py
"""

import asyncio
import sys
from pathlib import Path

from src.core.config import load_settings
from src.db.session import close_db, init_db, init_engine


def _ensure_storage_dirs(storage_root: str) -> None:
    root = Path(storage_root)
    for sub in ("bgm", "mixed"):
        (root / sub).mkdir(parents=True, exist_ok=True)
    print(f"[init_db] Storage directories ready: {root}")


async def _async_init() -> None:
    settings = load_settings()
    print(f"[init_db] Target database: {settings.database_path}")
    init_engine(settings.database_path)
    await init_db()
    _ensure_storage_dirs(settings.storage_root)
    await close_db()
    print("[init_db] Done.")


def main() -> None:
    asyncio.run(_async_init())


if __name__ == "__main__":
    main()
    sys.exit(0)
