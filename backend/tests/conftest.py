"""测试夹具。"""

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from src.core.config import AppSettings, get_settings


def make_test_settings(tmp_path: Path, **overrides: object) -> AppSettings:
    defaults: dict[str, object] = {
        "host": "127.0.0.1",
        "port": 8099,
        "debug": True,
        "database_path": str(tmp_path / "test.db"),
        "storage_root": str(tmp_path / "storage"),
        "session_secret": "test-session-secret",
        "session_cookie_name": "podcast_flow_session",
        "ffmpeg_path": "ffmpeg-not-installed-for-test",
        "ffprobe_path": "ffprobe-not-installed-for-test",
    }
    defaults.update(overrides)
    return AppSettings(**defaults)  # type: ignore[arg-type]


@pytest.fixture()
def test_settings(tmp_path: Path) -> AppSettings:
    return make_test_settings(tmp_path)


@pytest.fixture()
def client(test_settings: AppSettings, monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    from src.main import app

    monkeypatch.setattr("src.core.config._settings", test_settings)
    app.dependency_overrides[get_settings] = lambda: test_settings
    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client
    app.dependency_overrides.clear()
