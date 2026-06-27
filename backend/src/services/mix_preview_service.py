"""混音试听片段生成与临时文件管理。"""

import asyncio
import time
import uuid
from dataclasses import dataclass
from pathlib import Path

from pycore.core.logger import get_logger
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import AppSettings, get_settings
from src.core.ffmpeg import is_ffmpeg_available
from src.core.ffprobe import probe_audio_file
from src.core.mix_ffmpeg import build_mix_command
from src.models.mixed_audio import PreviewMixRequest, PreviewMixResponse
from src.repositories.bgm_repository import BgmRepository
from src.repositories.podcast_repository import PodcastRepository
from src.services.mix_exceptions import (
    FFmpegUnavailableError,
    MixForbiddenError,
    MixPreviewError,
    MixResourceNotFoundError,
)

logger = get_logger()

PREVIEW_TIMEOUT_SECONDS = 120
PREVIEW_TTL_SECONDS = 3600
DEFAULT_PREVIEW_DURATION = 30


@dataclass(frozen=True)
class _PreviewEntry:
    session_id: str
    path: Path
    created_at: float


_preview_registry: dict[str, _PreviewEntry] = {}


def _preview_dir(settings: AppSettings) -> Path:
    path = Path(settings.storage_root) / "previews"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _cleanup_expired_previews() -> None:
    now = time.time()
    expired = [
        preview_id
        for preview_id, entry in _preview_registry.items()
        if now - entry.created_at > PREVIEW_TTL_SECONDS
    ]
    for preview_id in expired:
        entry = _preview_registry.pop(preview_id, None)
        if entry is not None:
            entry.path.unlink(missing_ok=True)


class MixPreviewService:
    def __init__(self, db: AsyncSession, settings: AppSettings | None = None) -> None:
        self._db = db
        self._settings = settings or get_settings()
        self._podcast_repo = PodcastRepository(db)
        self._bgm_repo = BgmRepository(db)

    async def create_preview(
        self,
        session_id: str,
        body: PreviewMixRequest,
    ) -> PreviewMixResponse:
        _cleanup_expired_previews()

        podcast = await self._podcast_repo.get_by_id(session_id, body.podcast_source_id)
        bgm = await self._bgm_repo.get_by_id(session_id, body.bgm_source_id)

        if podcast is None or bgm is None or bgm.status != "available":
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        if not podcast.audio_source_url:
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        bgm_path = Path(bgm.file_path)
        if not bgm_path.is_file():
            raise MixResourceNotFoundError("播客或 BGM 资源不存在")

        if not is_ffmpeg_available(self._settings.ffmpeg_path, self._settings.ffprobe_path):
            raise FFmpegUnavailableError("FFmpeg 不可用，请安装 FFmpeg 后重试")

        start_sec = min(body.start_sec, max(0, podcast.duration - 1))
        max_preview = max(5, podcast.duration - start_sec)
        duration_sec = min(body.duration_sec, max_preview)

        preview_id = str(uuid.uuid4())
        output_path = _preview_dir(self._settings) / f"{preview_id}.mp3"

        cmd = build_mix_command(
            self._settings.ffmpeg_path,
            podcast.audio_source_url,
            str(bgm_path),
            str(output_path),
            podcast_volume=body.mix_config.podcast_volume,
            bgm_volume=body.mix_config.bgm_volume,
            bgm_loop=body.mix_config.bgm_loop,
            duration_sec=duration_sec,
            start_sec=start_sec,
            podcast_playback_rate=body.mix_config.podcast_playback_rate,
            bgm_playback_rate=body.mix_config.bgm_playback_rate,
        )

        try:
            exit_code = await _run_preview_ffmpeg(cmd)
        except TimeoutError as exc:
            output_path.unlink(missing_ok=True)
            raise MixPreviewError("试听生成超时，请稍后重试") from exc

        if exit_code != 0 or not output_path.is_file():
            output_path.unlink(missing_ok=True)
            raise MixPreviewError("试听生成失败，请稍后重试")

        try:
            probe = await probe_audio_file(self._settings.ffprobe_path, output_path)
            actual_duration = probe.duration
        except (ValueError, OSError):
            actual_duration = duration_sec

        _preview_registry[preview_id] = _PreviewEntry(
            session_id=session_id,
            path=output_path,
            created_at=time.time(),
        )

        logger.info(
            "Mix preview created",
            preview_id=preview_id,
            start_sec=start_sec,
            duration=actual_duration,
        )

        return PreviewMixResponse(
            preview_id=preview_id,
            play_url=f"/api/mixed-audios/preview/{preview_id}/stream",
            duration=actual_duration,
            start_sec=start_sec,
        )

    def get_preview_path(self, session_id: str, preview_id: str) -> Path:
        _cleanup_expired_previews()
        entry = _preview_registry.get(preview_id)
        if entry is None or entry.session_id != session_id:
            raise MixForbiddenError("试听资源不存在或已过期")
        if not entry.path.is_file():
            _preview_registry.pop(preview_id, None)
            raise MixForbiddenError("试听资源不存在或已过期")
        return entry.path


async def _run_preview_ffmpeg(cmd: list[str]) -> int:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    try:
        await asyncio.wait_for(proc.wait(), timeout=PREVIEW_TIMEOUT_SECONDS)
    except TimeoutError:
        proc.kill()
        await proc.wait()
        raise

    if proc.returncode is None:
        proc.kill()
        await proc.wait()
        raise TimeoutError

    return proc.returncode
