"""存储目录初始化测试。"""

from pathlib import Path

from src.core.storage import ensure_storage_dirs


def test_ensure_storage_dirs_creates_bgm_and_mixed(tmp_path: Path) -> None:
    root = tmp_path / "storage"
    ensure_storage_dirs(str(root))
    assert (root / "bgm").is_dir()
    assert (root / "mixed").is_dir()
