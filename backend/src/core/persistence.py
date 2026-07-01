"""生产环境数据持久化校验。"""

from __future__ import annotations

import sqlite3
from pathlib import Path


def validate_production_paths(*, debug: bool, database_path: str, storage_root: str) -> list[str]:
    """生产模式下 DATABASE_PATH / STORAGE_ROOT 必须位于 /data Volume 内。"""
    if debug:
        return []

    errors: list[str] = []
    db_path = database_path.strip()
    storage_path = storage_root.strip()

    if not db_path.startswith("/data/"):
        errors.append(
            f"production DATABASE_PATH must be under /data (current: {db_path!r}). "
            "Set Railway variable DATABASE_PATH=/data/podcast_flow.db"
        )
    if not storage_path.startswith("/data/"):
        errors.append(
            f"production STORAGE_ROOT must be under /data (current: {storage_path!r}). "
            "Set Railway variable STORAGE_ROOT=/data/storage"
        )
    return errors


def is_data_volume_mounted() -> bool:
    """检查 /data 是否为独立挂载点（Railway Volume 应挂载于此）。"""
    data_path = Path("/data")
    if not data_path.is_dir():
        return False

    try:
        with Path("/proc/mounts").open(encoding="utf-8") as handle:
            for line in handle:
                parts = line.split()
                if len(parts) >= 2 and parts[1] == "/data":
                    return True
    except OSError:
        pass

    try:
        import subprocess

        result = subprocess.run(
            ["mountpoint", "-q", "/data"],
            check=False,
            capture_output=True,
        )
        return result.returncode == 0
    except OSError:
        return False


def validate_production_volume(*, debug: bool) -> list[str]:
    if debug:
        return []
    if is_data_volume_mounted():
        return []
    return [
        "/data is not a persistent volume mount. "
        "Attach a Railway Volume with mount path /data before deploying to production."
    ]


def read_data_stats(database_path: str) -> dict[str, int | bool]:
    """读取数据库体量，用于启动日志与健康检查。"""
    db_path = Path(database_path)
    stats: dict[str, int | bool] = {
        "database_exists": db_path.is_file(),
        "database_bytes": db_path.stat().st_size if db_path.is_file() else 0,
        "user_count": 0,
        "mixed_audio_count": 0,
    }
    if not db_path.is_file():
        return stats

    conn = sqlite3.connect(db_path)
    try:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            ).fetchall()
        }
        if "users" in tables:
            stats["user_count"] = int(conn.execute("SELECT COUNT(*) FROM users").fetchone()[0])
        if "mixed_audio_assets" in tables:
            stats["mixed_audio_count"] = int(
                conn.execute("SELECT COUNT(*) FROM mixed_audio_assets").fetchone()[0]
            )
    finally:
        conn.close()

    return stats
