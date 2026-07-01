"""启动时打印数据库体量，便于确认 Volume 是否生效。"""

import sys

from src.core.config import load_settings
from src.core.persistence import read_data_stats


def main() -> None:
    settings = load_settings()
    stats = read_data_stats(settings.database_path)
    print(
        "[data] "
        f"db={settings.database_path} "
        f"storage={settings.storage_root} "
        f"exists={stats['database_exists']} "
        f"bytes={stats['database_bytes']} "
        f"users={stats['user_count']} "
        f"mixed={stats['mixed_audio_count']}"
    )
    if not settings.debug and stats["database_exists"] and stats["user_count"] == 0:
        print(
            "[data] WARNING: production database has zero users. "
            "If you expected existing accounts, verify Railway Volume is mounted at /data.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
    sys.exit(0)
