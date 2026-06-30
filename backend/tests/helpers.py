"""测试数据种子工具。"""

import json
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from src.core.config import AppSettings
from src.db.models import BgmSource, MixedAudioAsset, PodcastSource
from src.db.session import get_db_context


async def seed_sources(test_settings: AppSettings, user_id: str) -> tuple[str, str]:
    bgm_file = Path(test_settings.storage_root) / "bgm" / f"bgm-{uuid.uuid4()}.mp3"
    bgm_file.parent.mkdir(parents=True, exist_ok=True)
    bgm_file.write_bytes(b"fake-bgm")

    podcast_id = str(uuid.uuid4())
    bgm_id = str(uuid.uuid4())

    async with get_db_context() as db:
        db.add(
            PodcastSource(
                id=podcast_id,
                user_id=user_id,
                session_id=None,
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
                user_id=user_id,
                session_id=None,
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


async def seed_mixed_asset(
    test_settings: AppSettings,
    user_id: str,
    *,
    title: str,
    created_offset_sec: int = 0,
    status: str = "completed",
) -> tuple[str, Path | None]:
    bgm_file = Path(test_settings.storage_root) / "bgm" / f"bgm-{uuid.uuid4()}.mp3"
    bgm_file.parent.mkdir(parents=True, exist_ok=True)
    bgm_file.write_bytes(b"fake-bgm")

    podcast_id = str(uuid.uuid4())
    bgm_id = str(uuid.uuid4())
    mixed_id = str(uuid.uuid4())
    now = datetime.now(tz=UTC) + timedelta(seconds=created_offset_sec)
    mixed_file = Path(test_settings.storage_root) / "mixed" / f"{mixed_id}.mp3"
    if status == "completed":
        mixed_file.parent.mkdir(parents=True, exist_ok=True)
        mixed_file.write_bytes(b"fake-mixed")
        output_path: str | None = str(mixed_file)
    else:
        output_path = None

    async with get_db_context() as db:
        db.add(
            PodcastSource(
                id=podcast_id,
                user_id=user_id,
                session_id=None,
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
                user_id=user_id,
                session_id=None,
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
                user_id=user_id,
                session_id=None,
                podcast_source_id=podcast_id,
                bgm_source_id=bgm_id,
                title=title,
                duration=120,
                mix_config=json.dumps(
                    {
                        "podcast_volume": 1.0,
                        "podcast_playback_rate": 1.0,
                        "bgm_volume": 0.15,
                        "bgm_playback_rate": 1.0,
                        "bgm_loop": True,
                    }
                ),
                status=status,
                output_file_path=output_path,
                created_at=now,
                updated_at=now,
            )
        )
        await db.commit()

    return mixed_id, mixed_file if status == "completed" else None
