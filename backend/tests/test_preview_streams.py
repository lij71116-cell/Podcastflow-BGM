"""播客与 BGM stream 接口测试。"""

import asyncio
import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from src.core.config import AppSettings

from tests.conftest import register_test_user
from tests.helpers import seed_sources


class TestPreviewStreams:
    def test_bgm_stream_success(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        _, bgm_id = asyncio.run(seed_sources(test_settings, str(user["id"])))

        response = client.get(f"/api/bgm/{bgm_id}/stream")
        assert response.status_code == 200
        assert response.content == b"fake-bgm"

    def test_bgm_stream_not_found(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.get(f"/api/bgm/{uuid.uuid4()}/stream")
        assert response.status_code == 404

    def test_podcast_stream_not_found(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.get(f"/api/podcasts/{uuid.uuid4()}/stream")
        assert response.status_code == 404

    def test_podcast_stream_proxies_upstream(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        podcast_id, _ = asyncio.run(seed_sources(test_settings, str(user["id"])))

        async def _fake_iter(*args, **kwargs):
            async def body():
                yield b"fake-podcast-audio"

            return (
                200,
                {"content-type": "audio/mp4", "Content-Disposition": "inline", "Accept-Ranges": "bytes"},
                body(),
            )

        with patch("src.api.routes.podcasts.iter_podcast_upstream", new=AsyncMock(side_effect=_fake_iter)):
            response = client.get(f"/api/podcasts/{podcast_id}/stream")

        assert response.status_code == 200
        assert response.content == b"fake-podcast-audio"
        assert response.headers["content-type"].startswith("audio/")
