"""BGM 上传与链接校验测试。"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from src.core.ffprobe import AudioProbeResult
from src.services.bgm_exceptions import BgmUrlUnavailableError, FfprobeUnavailableError

from tests.conftest import register_test_user


def _mock_probe() -> AsyncMock:
    return AsyncMock(return_value=AudioProbeResult(duration=180, format="mp3"))


class TestBgmUpload:
    def test_unsupported_format(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.post(
            "/api/bgm/upload",
            files={"file": ("test.txt", b"hello", "text/plain")},
        )
        assert response.status_code == 400
        body = response.json()
        assert body["code"] == 40003

    def test_file_too_large(self, client: TestClient, test_settings) -> None:
        register_test_user(client)
        test_settings.max_bgm_file_size_mb = 1
        big = b"x" * (1024 * 1024 + 1)
        with patch("src.services.bgm_service.probe_audio_file", _mock_probe()):
            response = client.post(
                "/api/bgm/upload",
                files={"file": ("big.mp3", big, "audio/mpeg")},
            )
        assert response.status_code == 400
        assert response.json()["code"] == 40004

    def test_upload_success(self, client: TestClient, test_settings) -> None:
        register_test_user(client)
        with patch("src.services.bgm_service.probe_audio_file", _mock_probe()):
            response = client.post(
                "/api/bgm/upload",
                files={"file": ("focus-rain.mp3", b"fake-mp3", "audio/mpeg")},
            )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        data = body["data"]
        assert data["source_type"] == "upload"
        assert data["status"] == "available"
        assert data["duration"] == 180
        assert data["title"] == "focus-rain"
        from pathlib import Path

        bgm_dir = Path(test_settings.storage_root) / "bgm"
        assert any(bgm_dir.glob("*.mp3"))

    def test_ffprobe_unavailable(self, client: TestClient) -> None:
        register_test_user(client)
        with patch(
            "src.services.bgm_service.probe_audio_file",
            AsyncMock(side_effect=FfprobeUnavailableError("音频探测服务不可用，请安装 FFmpeg（ffprobe）")),
        ):
            response = client.post(
                "/api/bgm/upload",
                files={"file": ("test.mp3", b"fake", "audio/mpeg")},
            )
        assert response.status_code == 503
        assert response.json()["code"] == 50301


class TestBgmValidateUrl:
    def test_invalid_url(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.post(
            "/api/bgm/validate-url",
            json={"source_url": "ftp://example.com/a.mp3"},
        )
        assert response.status_code == 400
        assert response.json()["code"] == 40005

    def test_url_unavailable(self, client: TestClient) -> None:
        register_test_user(client)
        mock_response = AsyncMock(status_code=404, content=b"", headers={})
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch("src.services.bgm_service.httpx.AsyncClient", return_value=mock_client):
            response = client.post(
                "/api/bgm/validate-url",
                json={"source_url": "https://example.com/missing.mp3"},
            )
        assert response.status_code == 400
        assert response.json()["code"] == 40005

    def test_validate_success(self, client: TestClient, test_settings) -> None:
        register_test_user(client)
        mock_response = AsyncMock(
            status_code=200,
            content=b"fake-mp3-bytes",
            headers={"content-type": "audio/mpeg"},
        )
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with (
            patch("src.services.bgm_service.httpx.AsyncClient", return_value=mock_client),
            patch("src.services.bgm_service.probe_audio_file", _mock_probe()),
        ):
            response = client.post(
                "/api/bgm/validate-url",
                json={"source_url": "https://example.com/focus-bgm.mp3"},
            )

        assert response.status_code == 200
        data = response.json()["data"]
        assert data["source_type"] == "url"
        assert data["source_url"] == "https://example.com/focus-bgm.mp3"
        assert data["title"] == "focus-bgm"

        from pathlib import Path

        assert any((Path(test_settings.storage_root) / "bgm").glob("*.mp3"))

    def test_httpx_trust_env_false(self) -> None:
        import asyncio

        from src.services.bgm_service import BgmService

        mock_response = AsyncMock(status_code=404, content=b"", headers={})
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("src.services.bgm_service.httpx.AsyncClient") as mock_cls:
            mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)
            service = BgmService(db=AsyncMock())  # type: ignore[arg-type]

            with pytest.raises(BgmUrlUnavailableError):
                asyncio.run(service.validate_and_download_url("user-id", "https://example.com/a.mp3"))

            _, kwargs = mock_cls.call_args
            assert kwargs.get("trust_env") is False
