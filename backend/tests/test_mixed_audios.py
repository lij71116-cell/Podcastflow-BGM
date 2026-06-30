"""POST /api/mixed-audios 与 GET /api/mixed-audios/{id}/task 测试。"""

import asyncio
import json
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from src.core.config import AppSettings
from src.db.session import get_db_context

from tests.conftest import register_test_user
from tests.helpers import seed_sources


def _create_payload(podcast_id: str, bgm_id: str) -> dict[str, object]:
    return {
        "podcast_source_id": podcast_id,
        "bgm_source_id": bgm_id,
        "mix_config": {
            "podcast_volume": 1.0,
            "bgm_volume": 0.15,
            "bgm_loop": True,
        },
    }


class TestCreateMixedAudio:
    def test_resource_not_found(self, client: TestClient) -> None:
        register_test_user(client)
        with patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True):
            response = client.post(
                "/api/mixed-audios",
                json={
                    "podcast_source_id": str(uuid.uuid4()),
                    "bgm_source_id": str(uuid.uuid4()),
                    "mix_config": {
                        "podcast_volume": 1.0,
                        "bgm_volume": 0.15,
                        "bgm_loop": True,
                    },
                },
            )
        assert response.status_code == 404
        assert response.json()["code"] == 40401

    def test_ffmpeg_unavailable(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        user_id = str(user["id"])
        podcast_id, bgm_id = asyncio.run(seed_sources(test_settings, user_id))

        with patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=False):
            response = client.post(
                "/api/mixed-audios",
                json=_create_payload(podcast_id, bgm_id),
            )

        assert response.status_code == 503
        assert response.json()["code"] == 50301

    def test_create_success(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        user_id = str(user["id"])
        podcast_id, bgm_id = asyncio.run(seed_sources(test_settings, user_id))

        with (
            patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
            patch("src.services.mixed_audio_service.schedule_mix") as mock_schedule,
        ):
            response = client.post(
                "/api/mixed-audios",
                json=_create_payload(podcast_id, bgm_id),
            )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        data = body["data"]
        assert data["mixed_audio"]["status"] == "pending"
        assert data["task"]["status"] == "pending"
        assert data["mixed_audio"]["podcast"]["id"] == podcast_id
        assert data["mixed_audio"]["bgm"]["id"] == bgm_id
        assert "output_file_path" not in json.dumps(data)
        mock_schedule.assert_called_once()


class TestGetMixTask:
    def test_forbidden_wrong_user(self, client: TestClient, test_settings: AppSettings) -> None:
        owner = register_test_user(client, suffix="owner")
        user_id = str(owner["id"])
        podcast_id, bgm_id = asyncio.run(seed_sources(test_settings, user_id))

        with (
            patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
            patch("src.services.mixed_audio_service.schedule_mix"),
        ):
            created = client.post(
                "/api/mixed-audios",
                json=_create_payload(podcast_id, bgm_id),
            )

        assert created.status_code == 200, created.text

        mixed_id = created.json()["data"]["mixed_audio"]["id"]
        register_test_user(client, suffix="other")
        response = client.get(f"/api/mixed-audios/{mixed_id}/task")
        assert response.status_code == 403
        assert response.json()["code"] == 40301

    def test_get_task_success(self, client: TestClient, test_settings: AppSettings) -> None:
        user = register_test_user(client)
        user_id = str(user["id"])
        podcast_id, bgm_id = asyncio.run(seed_sources(test_settings, user_id))

        with (
            patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
            patch("src.services.mixed_audio_service.schedule_mix"),
        ):
            created = client.post(
                "/api/mixed-audios",
                json=_create_payload(podcast_id, bgm_id),
            )

        mixed_id = created.json()["data"]["mixed_audio"]["id"]
        response = client.get(f"/api/mixed-audios/{mixed_id}/task")
        assert response.status_code == 200
        task = response.json()["data"]
        assert task["mixed_audio_id"] == mixed_id
        assert task["status"] == "pending"


class TestMixWorker:
    @pytest.mark.asyncio
    async def test_worker_fails_without_ffmpeg(
        self, client: TestClient, test_settings: AppSettings
    ) -> None:
        from src.models.mixed_audio import CreateMixedAudioRequest, MixConfigDTO
        from src.repositories.mixed_audio_repository import MixedAudioRepository
        from src.services.mix_worker import run_mix
        from src.services.mixed_audio_service import MixedAudioService

        user = register_test_user(client)
        user_id = str(user["id"])
        podcast_id, bgm_id = await seed_sources(test_settings, user_id)

        async with get_db_context() as db:
            service = MixedAudioService(db, test_settings)
            with (
                patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
                patch("src.services.mixed_audio_service.schedule_mix"),
            ):
                result = await service.create(
                    user_id,
                    CreateMixedAudioRequest(
                        podcast_source_id=podcast_id,
                        bgm_source_id=bgm_id,
                        mix_config=MixConfigDTO(
                            podcast_volume=1.0,
                            bgm_volume=0.15,
                            bgm_loop=True,
                        ),
                    ),
                )
            mixed_id = result.mixed_audio.id

        with (
            patch("src.services.mix_worker.get_settings", return_value=test_settings),
            patch("src.core.ffmpeg.is_ffmpeg_available", return_value=False),
        ):
            await run_mix(mixed_id)

        async with get_db_context() as db:
            repo = MixedAudioRepository(db)
            asset = await repo.get_asset_with_relations(user_id, mixed_id)
            assert asset is not None
            assert asset.status == "failed"
            task = await repo.get_latest_task(mixed_id)
            assert task is not None
            assert task.status == "failed"
            assert task.error_message

    @pytest.mark.asyncio
    async def test_worker_success_mock_ffmpeg(
        self, client: TestClient, test_settings: AppSettings
    ) -> None:
        from src.core.ffprobe import AudioProbeResult
        from src.models.mixed_audio import CreateMixedAudioRequest, MixConfigDTO
        from src.repositories.mixed_audio_repository import MixedAudioRepository
        from src.services.mix_worker import run_mix
        from src.services.mixed_audio_service import MixedAudioService

        user = register_test_user(client)
        user_id = str(user["id"])
        podcast_id, bgm_id = await seed_sources(test_settings, user_id)

        async with get_db_context() as db:
            service = MixedAudioService(db, test_settings)
            with (
                patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
                patch("src.services.mixed_audio_service.schedule_mix"),
            ):
                result = await service.create(
                    user_id,
                    CreateMixedAudioRequest(
                        podcast_source_id=podcast_id,
                        bgm_source_id=bgm_id,
                        mix_config=MixConfigDTO(
                            podcast_volume=1.0,
                            bgm_volume=0.15,
                            bgm_loop=True,
                        ),
                    ),
                )
            mixed_id = result.mixed_audio.id

        output_path = Path(test_settings.storage_root) / "mixed" / f"{mixed_id}.mp3"

        async def _fake_run_ffmpeg(*args, **kwargs) -> int:
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(b"fake-mp3-output")
            return 0

        with (
            patch("src.services.mix_worker.get_settings", return_value=test_settings),
            patch("src.services.mix_worker.is_ffmpeg_available", return_value=True),
            patch("src.services.mix_worker._run_ffmpeg", new=_fake_run_ffmpeg),
            patch(
                "src.services.mix_worker.probe_audio_file",
                AsyncMock(return_value=AudioProbeResult(duration=120, format="mp3")),
            ),
        ):
            await run_mix(mixed_id)

        async with get_db_context() as db:
            repo = MixedAudioRepository(db)
            asset = await repo.get_asset_with_relations(user_id, mixed_id)
            assert asset is not None
            assert asset.status == "completed"
            assert asset.output_file_path == str(output_path)
            task = await repo.get_latest_task(mixed_id)
            assert task is not None
            assert task.status == "completed"
            assert task.progress == 100


class TestMixPreviewApi:
    def test_preview_missing_resources(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.post(
            "/api/mixed-audios/preview",
            json={
                "podcast_source_id": str(uuid.uuid4()),
                "bgm_source_id": str(uuid.uuid4()),
                "mix_config": {
                    "podcast_volume": 1.0,
                    "bgm_volume": 0.15,
                    "bgm_loop": True,
                },
            },
        )
        assert response.status_code == 404
        assert response.json()["code"] == 40401

    def test_preview_success(self, client: TestClient, test_settings: AppSettings) -> None:
        from src.core.ffprobe import AudioProbeResult

        user = register_test_user(client)
        user_id = str(user["id"])
        podcast_id, bgm_id = asyncio.run(seed_sources(test_settings, user_id))

        async def _fake_run(cmd: list[str], timeout_seconds: int = 1800) -> int:
            output = Path(cmd[-1])
            output.write_bytes(b"fake-preview-mp3")
            return 0

        with (
            patch("src.services.mix_preview_service.is_ffmpeg_available", return_value=True),
            patch("src.services.mix_preview_service._run_preview_ffmpeg", new=_fake_run),
            patch(
                "src.services.mix_preview_service.probe_audio_file",
                AsyncMock(return_value=AudioProbeResult(duration=120, format="mp3")),
            ),
        ):
            response = client.post(
                "/api/mixed-audios/preview",
                json=_create_payload(podcast_id, bgm_id),
            )

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        data = body["data"]
        assert data["duration"] == 120
        assert data["play_url"].startswith("/api/mixed-audios/preview/")
        assert data["start_sec"] == 0

        stream = client.get(data["play_url"])
        assert stream.status_code == 200
        assert stream.headers["content-type"].startswith("audio/mpeg")

    def test_preview_stream_forbidden(self, client: TestClient) -> None:
        register_test_user(client)
        response = client.get(f"/api/mixed-audios/preview/{uuid.uuid4()}/stream")
        assert response.status_code == 403
