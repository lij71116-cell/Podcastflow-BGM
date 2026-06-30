"""GET /api/mixed-audios/{id}/stream 播放测试。"""

import asyncio
import uuid

from fastapi.testclient import TestClient
from src.core.config import AppSettings

from tests.conftest import register_test_user
from tests.helpers import seed_mixed_asset


class TestMixedAudioStream:
    def test_stream_success(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        mixed_id, _ = asyncio.run(seed_mixed_asset(test_settings, str(user["id"]), title="stream-test"))

        response = client.get(f"/api/mixed-audios/{mixed_id}/stream")
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("audio/mpeg")
        assert "inline" in response.headers.get("content-disposition", "")
        assert len(response.content) > 0

    def test_stream_not_completed(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        mixed_id, _ = asyncio.run(
            seed_mixed_asset(test_settings, str(user["id"]), title="stream-test", status="mixing")
        )

        response = client.get(f"/api/mixed-audios/{mixed_id}/stream")
        assert response.status_code == 403
        body = response.json()
        assert body["code"] == 40301

    def test_stream_range(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        mixed_id, mixed_file = asyncio.run(
            seed_mixed_asset(test_settings, str(user["id"]), title="stream-test")
        )
        assert mixed_file is not None
        file_size = mixed_file.stat().st_size

        response = client.get(
            f"/api/mixed-audios/{mixed_id}/stream",
            headers={"Range": "bytes=0-9"},
        )
        assert response.status_code == 206
        assert len(response.content) == 10
        assert response.headers.get("accept-ranges") == "bytes"
        assert "content-range" in response.headers

        full = client.get(f"/api/mixed-audios/{mixed_id}/stream")
        assert len(full.content) == file_size

    def test_stream_not_found(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.get(f"/api/mixed-audios/{uuid.uuid4()}/stream")
        assert response.status_code == 404

    def test_stream_other_user_forbidden(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        owner = register_test_user(client, suffix="owner")
        mixed_id, _ = asyncio.run(
            seed_mixed_asset(test_settings, str(owner["id"]), title="stream-test")
        )

        register_test_user(client, suffix="other")
        response = client.get(f"/api/mixed-audios/{mixed_id}/stream")
        assert response.status_code == 403
        assert response.json()["code"] == 40301
