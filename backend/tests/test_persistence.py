"""生产持久化路径校验测试。"""

from src.core.persistence import (
    is_data_volume_mounted,
    read_data_stats,
    validate_production_paths,
    validate_production_volume,
)


def test_validate_production_paths_allows_local_debug() -> None:
    errors = validate_production_paths(
        debug=True,
        database_path="backend/data/podcast_flow.db",
        storage_root="backend/storage",
    )
    assert errors == []


def test_validate_production_paths_requires_data_prefix() -> None:
    errors = validate_production_paths(
        debug=False,
        database_path="/app/backend/data/podcast_flow.db",
        storage_root="/app/backend/storage",
    )
    assert len(errors) == 2
    assert all("/data" in err for err in errors)


def test_validate_production_paths_accepts_volume_paths() -> None:
    errors = validate_production_paths(
        debug=False,
        database_path="/data/podcast_flow.db",
        storage_root="/data/storage",
    )
    assert errors == []


def test_read_data_stats_missing_db() -> None:
    stats = read_data_stats("/tmp/podcast-flow-missing-test.db")
    assert stats["database_exists"] is False
    assert stats["user_count"] == 0


def test_is_data_volume_mounted_does_not_crash() -> None:
    assert isinstance(is_data_volume_mounted(), bool)


def test_validate_production_volume_skips_in_debug() -> None:
    assert validate_production_volume(debug=True) == []
