"""POST /api/mixed-audios/{id}/regenerate 测试。"""

import asyncio
import json
from unittest.mock import patch

from fastapi.testclient import TestClient
from src.core.config import AppSettings
from src.db.session import get_db_context
from src.repositories.mixed_audio_repository import MixedAudioRepository

from tests.conftest import register_test_user
from tests.helpers import seed_mixed_asset


def _mix_config() -> dict[str, object]:
    return {
        "podcast_volume": 0.9,
        "podcast_playback_rate": 1.0,
        "bgm_volume": 0.2,
        "bgm_playback_rate": 1.0,
        "bgm_loop": True,
        "fade_in": 2,
        "fade_out": 3,
    }


class TestRegenerateMixedAudio:
    def test_regenerate_success(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        user = register_test_user(client)
        user_id = str(user["id"])
        mixed_id = asyncio.run(
            seed_mixed_asset(test_settings, user_id, title="可重新生成", status="completed")
        )[0]

        with (
            patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
            patch("src.services.mixed_audio_service.schedule_mix") as mock_schedule,
        ):
            response = client.post(
                f"/api/mixed-audios/{mixed_id}/regenerate",
                json={"mix_config": _mix_config()},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        data = body["data"]
        assert data["mixed_audio"]["id"] == mixed_id
        assert data["mixed_audio"]["status"] == "pending"
        assert data["mixed_audio"]["mix_config"]["fade_in"] == 2
        assert data["task"]["mixed_audio_id"] == mixed_id
        assert data["task"]["status"] == "pending"
        mock_schedule.assert_called_once_with(mixed_id)

    def test_regenerate_in_progress_rejected(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        user = register_test_user(client)
        user_id = str(user["id"])
        mixed_id = asyncio.run(
            seed_mixed_asset(test_settings, user_id, title="合成中", status="mixing")
        )[0]

        with patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True):
            response = client.post(
                f"/api/mixed-audios/{mixed_id}/regenerate",
                json={"mix_config": _mix_config()},
            )

        assert response.status_code == 409
        assert response.json()["code"] == 40901

    def test_regenerate_keeps_same_id_and_updates_config(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        user = register_test_user(client)
        user_id = str(user["id"])
        mixed_id = asyncio.run(
            seed_mixed_asset(test_settings, user_id, title="覆盖合成", status="completed")
        )[0]

        with (
            patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
            patch("src.services.mixed_audio_service.schedule_mix"),
        ):
            response = client.post(
                f"/api/mixed-audios/{mixed_id}/regenerate",
                json={"mix_config": _mix_config()},
            )

        assert response.status_code == 200

        async def _read_config() -> str:
            async with get_db_context() as db:
                repo = MixedAudioRepository(db)
                asset = await repo.get_by_id(mixed_id)
                assert asset is not None
                return asset.mix_config

        stored = asyncio.run(_read_config())
        parsed = json.loads(stored)
        assert parsed["bgm_volume"] == 0.2
        assert parsed["fade_out"] == 3

        detail = client.get(f"/api/mixed-audios/{mixed_id}")
        assert detail.status_code == 200
        assert detail.json()["data"]["id"] == mixed_id

    def test_regenerate_cross_user_forbidden(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        owner = register_test_user(client, suffix="regen_owner")
        mixed_id = asyncio.run(
            seed_mixed_asset(test_settings, str(owner["id"]), title="私有", status="completed")
        )[0]

        register_test_user(client, suffix="regen_other")
        with patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True):
            response = client.post(
                f"/api/mixed-audios/{mixed_id}/regenerate",
                json={"mix_config": _mix_config()},
            )

        assert response.status_code == 403
        assert response.json()["code"] == 40301
