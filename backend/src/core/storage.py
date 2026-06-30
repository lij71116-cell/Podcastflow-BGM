"""本地存储目录初始化。"""

from pathlib import Path

from pycore.core.logger import get_logger

logger = get_logger()


def ensure_storage_dirs(storage_root: str) -> None:
    """创建 STORAGE_ROOT 及 bgm/、mixed/ 子目录。"""
    root = Path(storage_root)
    for sub in ("bgm", "mixed", "covers"):
        (root / sub).mkdir(parents=True, exist_ok=True)
    logger.info("Storage directories ready", storage_root=str(root))
