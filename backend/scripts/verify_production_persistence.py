"""容器启动前校验生产持久化配置。"""

import sys

from src.core.config import load_settings
from src.core.persistence import validate_production_paths, validate_production_volume


def main() -> None:
    settings = load_settings()
    errors = [
        *validate_production_paths(
            debug=settings.debug,
            database_path=settings.database_path,
            storage_root=settings.storage_root,
        ),
        *validate_production_volume(debug=settings.debug),
    ]
    if not errors:
        print("[persist] Production persistence checks passed")
        return

    for message in errors:
        print(f"[persist] FATAL: {message}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    main()
