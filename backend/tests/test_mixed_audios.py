"""POST /api/mixed-audios 与 GET /api/mixed-audios/{id}/task 测试。"""

import asyncio
import json
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from src.core.config import AppSettings
from src.db.models import AppSession, BgmSource, PodcastSource
from src.db.session import get_db_context


async def _seed_sources(
    test_settings: AppSettings,
    session_id: str,
) -> tuple[str, str]:
    bgm_file = Path(test_settings.storage_root) / "bgm" / "test-bgm.mp3"
    bgm_file.parent.mkdir(parents=True, exist_ok=True)
    bgm_file.write_bytes(b"fake-bgm")

    podcast_id = str(uuid.uuid4())
    bgm_id = str(uuid.uuid4())

    async with get_db_context() as db:
        existing = await db.get(AppSession, session_id)
        if existing is None:
            db.add(AppSession(session_id=session_id))
        db.add(
            PodcastSource(
                id=podcast_id,
                session_id=session_id,
                source_url="https://www.xiaoyuzhoufm.com/episode/test",
                episode_id="test",
                title="测试播客",
                podcast_name="测试节目",
                cover_url="",
                duration=120,
                audio_source_url="https://example.com/podcast.m4a",
            )
        )
        db.add(
            BgmSource(
                id=bgm_id,
                session_id=session_id,
                source_type="upload",
                file_path=str(bgm_file),
                title="test-bgm",
                duration=60,
                format="mp3",
                status="available",
            )
        )
        await db.commit()

    return podcast_id, bgm_id


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
        client.get("/api/session")
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
        import asyncio

        session_resp = client.get("/api/session")
        session_id = session_resp.json()["data"]["session_id"]
        podcast_id, bgm_id = asyncio.run(_seed_sources(test_settings, session_id))

        with patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=False):
            response = client.post(
                "/api/mixed-audios",
                json=_create_payload(podcast_id, bgm_id),
            )

        assert response.status_code == 503
        assert response.json()["code"] == 50301

    def test_create_success(self, client: TestClient, test_settings: AppSettings) -> None:
        import asyncio

        session_resp = client.get("/api/session")
        session_id = session_resp.json()["data"]["session_id"]
        podcast_id, bgm_id = asyncio.run(_seed_sources(test_settings, session_id))

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
    def test_forbidden_wrong_session(self, client: TestClient, test_settings: AppSettings) -> None:
        import asyncio

        client.get("/api/session")
        owner_session = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        podcast_id, bgm_id = asyncio.run(_seed_sources(test_settings, owner_session))

        with (
            patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
            patch("src.services.mixed_audio_service.schedule_mix"),
        ):
            client.cookies.set("podcast_flow_session", owner_session)
            created = client.post(
                "/api/mixed-audios",
                json=_create_payload(podcast_id, bgm_id),
            )

        assert created.status_code == 200, created.text

        mixed_id = created.json()["data"]["mixed_audio"]["id"]
        client.cookies.clear()
        client.get("/api/session")
        response = client.get(f"/api/mixed-audios/{mixed_id}/task")
        assert response.status_code == 403
        assert response.json()["code"] == 40301

    def test_get_task_success(self, client: TestClient, test_settings: AppSettings) -> None:
        import asyncio

        session_resp = client.get("/api/session")
        session_id = session_resp.json()["data"]["session_id"]
        podcast_id, bgm_id = asyncio.run(_seed_sources(test_settings, session_id))

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

        session_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
        client.get("/api/session", cookies={"podcast_flow_session": session_id})
        podcast_id, bgm_id = await _seed_sources(test_settings, session_id)

        async with get_db_context() as db:
            service = MixedAudioService(db, test_settings)
            with (
                patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
                patch("src.services.mixed_audio_service.schedule_mix"),
            ):
                result = await service.create(
                    session_id,
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
            asset = await repo.get_asset_with_relations(session_id, mixed_id)
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

        session_id = "cccccccc-cccc-cccc-cccc-cccccccccccc"
        client.get("/api/session")
        client.cookies.set("podcast_flow_session", session_id)
        podcast_id, bgm_id = await _seed_sources(test_settings, session_id)

        async with get_db_context() as db:
            service = MixedAudioService(db, test_settings)
            with (
                patch("src.services.mixed_audio_service.is_ffmpeg_available", return_value=True),
                patch("src.services.mixed_audio_service.schedule_mix"),
            ):
                result = await service.create(
                    session_id,
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
            asset = await repo.get_asset_with_relations(session_id, mixed_id)
            assert asset is not None
            assert asset.status == "completed"
            assert asset.output_file_path == str(output_path)
            task = await repo.get_latest_task(mixed_id)
            assert task is not None
            assert task.status == "completed"
            assert task.progress == 100


class TestMixPreviewApi:
    def test_preview_missing_resources(self, client: TestClient) -> None:
        client.get("/api/session")
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

        preview_file = Path(test_settings.storage_root) / "previews" / "fake-preview.mp3"
        preview_file.parent.mkdir(parents=True, exist_ok=True)
        preview_file.write_bytes(b"fake-preview-mp3")

        async def _fake_run(cmd: list[str]) -> int:
            output = Path(cmd[-1])
            output.write_bytes(b"fake-preview-mp3")
            return 0

        session_resp = client.get("/api/session")
        session_id = session_resp.json()["data"]["session_id"]
        podcast_id, bgm_id = asyncio.run(_seed_sources(test_settings, session_id))

        with (
            patch("src.services.mix_preview_service.is_ffmpeg_available", return_value=True),
            patch("src.services.mix_preview_service._run_preview_ffmpeg", new=_fake_run),
            patch(
                "src.services.mix_preview_service.probe_audio_file",
                AsyncMock(return_value=AudioProbeResult(duration=30, format="mp3")),
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
        assert data["duration"] == 30
        assert data["play_url"].startswith("/api/mixed-audios/preview/")
        assert data["start_sec"] == 0

        stream = client.get(data["play_url"])
        assert stream.status_code == 200
        assert stream.headers["content-type"].startswith("audio/mpeg")

    def test_preview_stream_forbidden(self, client: TestClient) -> None:
        client.get("/api/session")
        response = client.get(f"/api/mixed-audios/preview/{uuid.uuid4()}/stream")
        assert response.status_code == 403
