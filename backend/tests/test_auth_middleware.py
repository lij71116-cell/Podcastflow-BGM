"""Auth 中间件与用户隔离测试（T-022）。"""

import asyncio
import json
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from src.core.config import AppSettings
from src.db.models import BgmSource, MixedAudioAsset, PodcastSource
from src.db.session import get_db_context

from tests.conftest import register_test_user


async def _seed_legacy_session_asset(
    test_settings: AppSettings,
    session_id: str,
    *,
    title: str = "匿名资产",
) -> str:
    bgm_file = Path(test_settings.storage_root) / "bgm" / f"legacy-{uuid.uuid4()}.mp3"
    bgm_file.parent.mkdir(parents=True, exist_ok=True)
    bgm_file.write_bytes(b"fake-bgm")

    podcast_id = str(uuid.uuid4())
    bgm_id = str(uuid.uuid4())
    mixed_id = str(uuid.uuid4())

    async with get_db_context() as db:
        db.add(
            PodcastSource(
                id=podcast_id,
                user_id=None,
                session_id=session_id,
                source_url="https://www.xiaoyuzhoufm.com/episode/legacy",
                episode_id="legacy",
                title="匿名播客",
                podcast_name="匿名节目",
                cover_url="",
                duration=60,
                audio_source_url="https://example.com/pod.m4a",
            )
        )
        db.add(
            BgmSource(
                id=bgm_id,
                user_id=None,
                session_id=session_id,
                source_type="upload",
                file_path=str(bgm_file),
                title="legacy-bgm",
                duration=30,
                format="mp3",
                status="available",
            )
        )
        db.add(
            MixedAudioAsset(
                id=mixed_id,
                user_id=None,
                session_id=session_id,
                podcast_source_id=podcast_id,
                bgm_source_id=bgm_id,
                title=title,
                duration=60,
                mix_config=json.dumps({"podcast_volume": 1.0, "bgm_volume": 0.15, "bgm_loop": True}),
                status="completed",
                output_file_path=str(Path(test_settings.storage_root) / "mixed" / f"{mixed_id}.mp3"),
            )
        )
        await db.commit()
    return mixed_id


async def _seed_user_asset(test_settings: AppSettings, user_id: str, title: str) -> str:
    bgm_file = Path(test_settings.storage_root) / "bgm" / f"user-{uuid.uuid4()}.mp3"
    bgm_file.parent.mkdir(parents=True, exist_ok=True)
    bgm_file.write_bytes(b"fake-bgm")

    podcast_id = str(uuid.uuid4())
    bgm_id = str(uuid.uuid4())
    mixed_id = str(uuid.uuid4())

    async with get_db_context() as db:
        db.add(
            PodcastSource(
                id=podcast_id,
                user_id=user_id,
                session_id=None,
                source_url="https://www.xiaoyuzhoufm.com/episode/user",
                episode_id="user",
                title="用户播客",
                podcast_name="用户节目",
                cover_url="",
                duration=60,
                audio_source_url="https://example.com/pod.m4a",
            )
        )
        db.add(
            BgmSource(
                id=bgm_id,
                user_id=user_id,
                session_id=None,
                source_type="upload",
                file_path=str(bgm_file),
                title="user-bgm",
                duration=30,
                format="mp3",
                status="available",
            )
        )
        mixed_file = Path(test_settings.storage_root) / "mixed" / f"{mixed_id}.mp3"
        mixed_file.parent.mkdir(parents=True, exist_ok=True)
        mixed_file.write_bytes(b"fake-mixed")
        db.add(
            MixedAudioAsset(
                id=mixed_id,
                user_id=user_id,
                session_id=None,
                podcast_source_id=podcast_id,
                bgm_source_id=bgm_id,
                title=title,
                duration=60,
                mix_config=json.dumps({"podcast_volume": 1.0, "bgm_volume": 0.15, "bgm_loop": True}),
                status="completed",
                output_file_path=str(mixed_file),
            )
        )
        await db.commit()
    return mixed_id


class TestAuthMiddleware:
    def test_unauthenticated_list_returns_401(self, client: TestClient) -> None:
        response = client.get("/api/mixed-audios")
        assert response.status_code == 401
        assert response.json()["code"] == 40101

    def test_health_skips_auth(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200

    def test_new_user_has_empty_library(self, client: TestClient, test_settings: AppSettings) -> None:
        legacy_id = "dddddddd-dddd-dddd-dddd-dddddddddddd"
        asyncio.run(_seed_legacy_session_asset(test_settings, legacy_id))

        register_test_user(client, suffix="empty")
        response = client.get("/api/mixed-audios")
        assert response.status_code == 200
        assert response.json()["data"]["total"] == 0

    def test_user_cannot_access_other_users_asset(
        self, client: TestClient, test_settings: AppSettings
    ) -> None:
        user_a = register_test_user(client, suffix="a")
        mixed_id = asyncio.run(_seed_user_asset(test_settings, user_a["id"], "A 的资产"))

        register_test_user(client, suffix="b")
        detail = client.get(f"/api/mixed-audios/{mixed_id}")
        assert detail.status_code == 403
        assert detail.json()["code"] == 40301

    def test_user_sees_only_own_assets(
        self, client: TestClient, test_settings: AppSettings
    ) -> None:
        user_a = register_test_user(client, suffix="owner")
        asyncio.run(_seed_user_asset(test_settings, user_a["id"], "我的资产"))

        response = client.get("/api/mixed-audios")
        assert response.status_code == 200
        items = response.json()["data"]["items"]
        assert len(items) == 1
        assert items[0]["title"] == "我的资产"
