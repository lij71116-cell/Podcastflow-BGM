"""DELETE /api/mixed-audios/{id} 删除测试。"""

import asyncio
import uuid

from fastapi.testclient import TestClient
from src.core.config import AppSettings

from tests.conftest import register_test_user
from tests.helpers import seed_mixed_asset


class TestMixedAudioDelete:
    def test_delete_success(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        user_id = str(user["id"])
        mixed_id, mixed_file = asyncio.run(seed_mixed_asset(test_settings, user_id, title="delete-test"))
        assert mixed_file is not None
        assert mixed_file.is_file()

        response = client.delete(f"/api/mixed-audios/{mixed_id}")
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        assert body["data"]["deleted"] is True
        assert body["data"]["id"] == mixed_id
        assert not mixed_file.is_file()

        detail = client.get(f"/api/mixed-audios/{mixed_id}")
        assert detail.status_code == 404

        stream = client.get(f"/api/mixed-audios/{mixed_id}/stream")
        assert stream.status_code == 404

        listing = client.get("/api/mixed-audios")
        assert listing.json()["data"]["total"] == 0

    def test_delete_not_found(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.delete(f"/api/mixed-audios/{uuid.uuid4()}")
        assert response.status_code == 404
        assert response.json()["code"] == 40401

    def test_delete_other_user_forbidden(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        owner = register_test_user(client, suffix="owner")
        mixed_id, mixed_file = asyncio.run(seed_mixed_asset(test_settings, str(owner["id"]), title="delete-test"))
        assert mixed_file is not None

        register_test_user(client, suffix="other")
        response = client.delete(f"/api/mixed-audios/{mixed_id}")
        assert response.status_code == 403
        assert response.json()["code"] == 40301
        assert mixed_file.is_file()
