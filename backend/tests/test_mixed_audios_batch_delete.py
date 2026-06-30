"""DELETE /api/mixed-audios/batch 批量删除测试。"""

import asyncio

from fastapi.testclient import TestClient
from src.core.config import AppSettings

from tests.conftest import register_test_user
from tests.helpers import seed_mixed_asset


class TestMixedAudiosBatchDelete:
    def test_batch_delete_success(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        user = register_test_user(client)
        user_id = str(user["id"])
        id_a, file_a = asyncio.run(
            seed_mixed_asset(test_settings, user_id, title="资产 A", created_offset_sec=-20)
        )
        id_b, file_b = asyncio.run(
            seed_mixed_asset(test_settings, user_id, title="资产 B", created_offset_sec=-10)
        )
        id_c, file_c = asyncio.run(
            seed_mixed_asset(test_settings, user_id, title="保留资产", created_offset_sec=0)
        )
        assert file_a is not None and file_b is not None and file_c is not None

        response = client.request(
            "DELETE",
            "/api/mixed-audios/batch",
            json={"ids": [id_a, id_b, "unknown-id"]},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        assert body["data"]["deleted_count"] == 2
        assert set(body["data"]["deleted_ids"]) == {id_a, id_b}
        assert not file_a.is_file()
        assert not file_b.is_file()
        assert file_c.is_file()

        listing = client.get("/api/mixed-audios")
        assert listing.json()["data"]["total"] == 1
        assert listing.json()["data"]["items"][0]["id"] == id_c

    def test_batch_delete_skips_other_user_assets(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        owner = register_test_user(client, suffix="owner")
        owner_id = str(owner["id"])
        mixed_id, mixed_file = asyncio.run(
            seed_mixed_asset(test_settings, owner_id, title="owner-only")
        )
        assert mixed_file is not None

        register_test_user(client, suffix="other")
        response = client.request(
            "DELETE",
            "/api/mixed-audios/batch",
            json={"ids": [mixed_id]},
        )
        assert response.status_code == 200
        assert response.json()["data"]["deleted_count"] == 0
        assert mixed_file.is_file()
