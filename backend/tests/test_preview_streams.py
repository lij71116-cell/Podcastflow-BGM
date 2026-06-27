"""播客与 BGM stream 接口测试。"""

import asyncio
import uuid
from pathlib import Path
from unittest.mock import AsyncMock, patch

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


class TestPreviewStreams:
    def test_bgm_stream_success(self, client: TestClient, test_settings: AppSettings) -> None:
        session_resp = client.get("/api/session")
        session_id = session_resp.json()["data"]["session_id"]
        _, bgm_id = asyncio.run(_seed_sources(test_settings, session_id))

        response = client.get(f"/api/bgm/{bgm_id}/stream")
        assert response.status_code == 200
        assert response.content == b"fake-bgm"

    def test_bgm_stream_not_found(self, client: TestClient) -> None:
        client.get("/api/session")
        response = client.get(f"/api/bgm/{uuid.uuid4()}/stream")
        assert response.status_code == 404

    def test_podcast_stream_not_found(self, client: TestClient) -> None:
        client.get("/api/session")
        response = client.get(f"/api/podcasts/{uuid.uuid4()}/stream")
        assert response.status_code == 404

    def test_podcast_stream_proxies_upstream(self, client: TestClient, test_settings: AppSettings) -> None:
        session_resp = client.get("/api/session")
        session_id = session_resp.json()["data"]["session_id"]
        podcast_id, _ = asyncio.run(_seed_sources(test_settings, session_id))

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
