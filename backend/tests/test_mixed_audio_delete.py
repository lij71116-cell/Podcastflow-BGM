"""DELETE /api/mixed-audios/{id} 删除测试。"""

import asyncio
import json
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from src.core.config import AppSettings
from src.db.models import AppSession, BgmSource, MixedAudioAsset, MixTask, PodcastSource
from src.db.session import get_db_context


async def _seed_mixed_asset(
    test_settings: AppSettings,
    session_id: str,
) -> tuple[str, Path]:
    bgm_file = Path(test_settings.storage_root) / "bgm" / f"bgm-{uuid.uuid4()}.mp3"
    bgm_file.parent.mkdir(parents=True, exist_ok=True)
    bgm_file.write_bytes(b"fake-bgm")

    mixed_id = str(uuid.uuid4())
    mixed_file = Path(test_settings.storage_root) / "mixed" / f"{mixed_id}.mp3"
    mixed_file.parent.mkdir(parents=True, exist_ok=True)
    mixed_file.write_bytes(b"ID3" + b"\x00" * 100)

    podcast_id = str(uuid.uuid4())
    bgm_id = str(uuid.uuid4())
    task_id = str(uuid.uuid4())

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
                title="测试播客单集",
                podcast_name="测试节目",
                cover_url="https://example.com/cover.jpg",
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
        db.add(
            MixedAudioAsset(
                id=mixed_id,
                session_id=session_id,
                podcast_source_id=podcast_id,
                bgm_source_id=bgm_id,
                title="delete-test",
                duration=120,
                mix_config=json.dumps({"podcast_volume": 1.0, "bgm_volume": 0.15, "bgm_loop": True}),
                status="completed",
                output_file_path=str(mixed_file),
            )
        )
        db.add(
            MixTask(
                id=task_id,
                mixed_audio_id=mixed_id,
                status="completed",
                progress=100,
            )
        )
        await db.commit()

    return mixed_id, mixed_file


class TestMixedAudioDelete:
    def test_delete_success(self, client: TestClient, test_settings: AppSettings) -> None:
        session_id = client.get("/api/session").json()["data"]["session_id"]
        mixed_id, mixed_file = asyncio.run(_seed_mixed_asset(test_settings, session_id))
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
        client.get("/api/session")
        response = client.delete(f"/api/mixed-audios/{uuid.uuid4()}")
        assert response.status_code == 404
        assert response.json()["code"] == 40401

    def test_delete_other_session_forbidden(
        self,
        client: TestClient,
        test_settings: AppSettings,
    ) -> None:
        owner_session = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        other_session = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
        client.get("/api/session", cookies={"podcast_flow_session": owner_session})
        mixed_id, mixed_file = asyncio.run(_seed_mixed_asset(test_settings, owner_session))

        client.get("/api/session", cookies={"podcast_flow_session": other_session})
        response = client.delete(
            f"/api/mixed-audios/{mixed_id}",
            cookies={"podcast_flow_session": other_session},
        )
        assert response.status_code == 404
        assert mixed_file.is_file()
