"""GET /api/mixed-audios 列表与 GET /api/mixed-audios/{id} 详情测试。"""

import asyncio
import json
import uuid

from fastapi.testclient import TestClient
from src.core.config import AppSettings

from tests.conftest import register_test_user
from tests.helpers import seed_mixed_asset


class TestMixedAudioListAndDetail:
    def test_list_empty(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.get("/api/mixed-audios")
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        assert body["data"]["items"] == []
        assert body["data"]["total"] == 0
        assert body["data"]["page"] == 1
        assert body["data"]["page_size"] == 10

    def test_list_and_detail_user_scoped(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        user = register_test_user(client)
        user_id = str(user["id"])
        older_id = asyncio.run(
            seed_mixed_asset(test_settings, user_id, title="较早资产", created_offset_sec=-10)
        )[0]
        newer_id = asyncio.run(
            seed_mixed_asset(test_settings, user_id, title="最新资产", created_offset_sec=10)
        )[0]

        list_resp = client.get("/api/mixed-audios")
        assert list_resp.status_code == 200
        items = list_resp.json()["data"]["items"]
        assert len(items) == 2
        assert items[0]["id"] == newer_id
        assert items[1]["id"] == older_id
        assert items[0]["download_enabled"] is False
        assert "output_file_path" not in json.dumps(items[0])
        assert "audio_source_url" not in json.dumps(items[0])
        assert "file_path" not in json.dumps(items[0])

        page_resp = client.get("/api/mixed-audios", params={"page": 1, "page_size": 1})
        assert page_resp.status_code == 200
        page_body = page_resp.json()["data"]
        assert page_body["total"] == 2
        assert page_body["page"] == 1
        assert page_body["page_size"] == 1
        assert len(page_body["items"]) == 1
        assert page_body["items"][0]["id"] == newer_id

        search_resp = client.get("/api/mixed-audios", params={"q": "较早"})
        assert search_resp.status_code == 200
        search_items = search_resp.json()["data"]["items"]
        assert len(search_items) == 1
        assert search_items[0]["id"] == older_id

        detail_resp = client.get(f"/api/mixed-audios/{newer_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()["data"]
        assert detail["title"] == "最新资产"
        assert detail["podcast"]["podcast_name"] == "测试节目"
        assert detail["bgm"]["title"] == "test-bgm"
        assert detail["mix_config"]["bgm_loop"] is True

    def test_detail_not_found(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.get(f"/api/mixed-audios/{uuid.uuid4()}")
        assert response.status_code == 404
        assert response.json()["code"] == 40401

    def test_detail_other_user_forbidden(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        owner = register_test_user(client, suffix="owner")
        mixed_id = asyncio.run(
            seed_mixed_asset(test_settings, str(owner["id"]), title="私有资产")
        )[0]

        register_test_user(client, suffix="other")
        response = client.get(f"/api/mixed-audios/{mixed_id}")
        assert response.status_code == 403
        assert response.json()["code"] == 40301

        list_resp = client.get("/api/mixed-audios")
        assert list_resp.json()["data"]["total"] == 0
