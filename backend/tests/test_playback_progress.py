"""播放进度 API 测试。"""

import asyncio

from fastapi.testclient import TestClient
from src.core.config import AppSettings

from tests.conftest import register_test_user
from tests.helpers import seed_mixed_asset


class TestPlaybackProgressApi:
    def test_get_empty(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        mixed_id = asyncio.run(
            seed_mixed_asset(test_settings, str(user["id"]), title="进度测试")
        )[0]

        response = client.get(
            f"/api/mixed-audios/{mixed_id}/playback-progress",
            params={"player_context": "global"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        assert body["data"] is None

    def test_save_and_get_global_and_inline(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        user = register_test_user(client)
        mixed_id = asyncio.run(
            seed_mixed_asset(test_settings, str(user["id"]), title="双端进度")
        )[0]

        save_global = client.put(
            f"/api/mixed-audios/{mixed_id}/playback-progress",
            json={
                "player_context": "global",
                "position_seconds": 125.5,
                "duration_seconds": 3180,
            },
        )
        assert save_global.status_code == 200
        global_data = save_global.json()["data"]
        assert global_data["player_context"] == "global"
        assert global_data["position_seconds"] == 125.5

        save_inline = client.put(
            f"/api/mixed-audios/{mixed_id}/playback-progress",
            json={
                "player_context": "inline",
                "position_seconds": 30,
                "duration_seconds": 3180,
            },
        )
        assert save_inline.status_code == 200

        get_global = client.get(
            f"/api/mixed-audios/{mixed_id}/playback-progress",
            params={"player_context": "global"},
        )
        assert get_global.json()["data"]["position_seconds"] == 125.5

        get_inline = client.get(
            f"/api/mixed-audios/{mixed_id}/playback-progress",
            params={"player_context": "inline"},
        )
        assert get_inline.json()["data"]["position_seconds"] == 30

    def test_cross_user_forbidden(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        owner = register_test_user(client, suffix="owner_pp")
        mixed_id = asyncio.run(
            seed_mixed_asset(test_settings, str(owner["id"]), title="私有资产")
        )[0]

        register_test_user(client, suffix="other_pp")
        response = client.get(
            f"/api/mixed-audios/{mixed_id}/playback-progress",
            params={"player_context": "global"},
        )
        assert response.status_code == 403
        assert response.json()["code"] == 40301

    def test_update_overwrites(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        user = register_test_user(client)
        mixed_id = asyncio.run(
            seed_mixed_asset(test_settings, str(user["id"]), title="覆盖进度")
        )[0]

        client.put(
            f"/api/mixed-audios/{mixed_id}/playback-progress",
            json={
                "player_context": "global",
                "position_seconds": 10,
                "duration_seconds": 100,
            },
        )
        client.put(
            f"/api/mixed-audios/{mixed_id}/playback-progress",
            json={
                "player_context": "global",
                "position_seconds": 88,
                "duration_seconds": 100,
            },
        )

        response = client.get(
            f"/api/mixed-audios/{mixed_id}/playback-progress",
            params={"player_context": "global"},
        )
        assert response.json()["data"]["position_seconds"] == 88
