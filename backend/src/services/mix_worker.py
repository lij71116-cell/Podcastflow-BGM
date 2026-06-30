"""FFmpeg 异步混音 Worker。"""

import asyncio
import json
from contextlib import suppress
from datetime import UTC, datetime
from pathlib import Path

from pycore.core.logger import get_logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.config import AppSettings, get_settings
from src.core.ffmpeg import is_ffmpeg_available
from src.core.ffprobe import probe_audio_file
from src.core.mix_ffmpeg import build_mix_command, estimate_progress, parse_ffmpeg_time_seconds
from src.db.models import MixedAudioAsset
from src.db.session import get_db_context
from src.repositories.mixed_audio_repository import MixedAudioRepository

logger = get_logger()

_worker_started = False


def schedule_mix(mixed_audio_id: str) -> None:
    """将合成任务提交到后台 asyncio 任务。"""
    asyncio.create_task(_run_mix_safe(mixed_audio_id))


async def recover_pending_mixes() -> None:
    """启动时恢复未完成的合成任务。"""
    async with get_db_context() as db:
        repo = MixedAudioRepository(db)
        pending_ids = await repo.list_recoverable_mixed_ids()

    for mixed_id in pending_ids:
        logger.info("Recovering mix task", mixed_audio_id=mixed_id)
        schedule_mix(mixed_id)


async def start_mix_worker() -> None:
    """标记 Worker 已启动并恢复 pending 任务。"""
    global _worker_started  # noqa: PLW0603
    if _worker_started:
        return
    _worker_started = True
    await recover_pending_mixes()


async def _run_mix_safe(mixed_audio_id: str) -> None:
    try:
        await run_mix(mixed_audio_id)
    except Exception as exc:
        logger.exception("Mix worker crashed", mixed_audio_id=mixed_audio_id, detail=str(exc))
        await _mark_failed(mixed_audio_id, "合成任务异常终止")


async def _load_asset(db: AsyncSession, mixed_audio_id: str) -> MixedAudioAsset | None:
    result = await db.execute(
        select(MixedAudioAsset)
        .options(
            selectinload(MixedAudioAsset.podcast_source),
            selectinload(MixedAudioAsset.bgm_source),
            selectinload(MixedAudioAsset.mix_tasks),
        )
        .where(MixedAudioAsset.id == mixed_audio_id)
    )
    return result.scalar_one_or_none()


async def run_mix(mixed_audio_id: str, settings: AppSettings | None = None) -> None:
    """执行单次混音合成。"""
    settings = settings or get_settings()

    async with get_db_context() as db:
        repo = MixedAudioRepository(db)
        asset = await _load_asset(db, mixed_audio_id)
        if asset is None or asset.status in ("completed", "failed"):
            return

        task = await repo.get_latest_task(mixed_audio_id)
        if task is None:
            return

        task_id = task.id
        podcast = asset.podcast_source
        bgm = asset.bgm_source
        mix_config = json.loads(asset.mix_config or "{}")

        if not is_ffmpeg_available(settings.ffmpeg_path, settings.ffprobe_path):
            await _fail_in_session(
                repo,
                mixed_audio_id,
                task_id,
                "FFmpeg 不可用，请安装 FFmpeg 后重试",
            )
            await db.commit()
            return

        if not podcast.audio_source_url:
            await _fail_in_session(repo, mixed_audio_id, task_id, "播客音频源不可用")
            await db.commit()
            return

        bgm_path = Path(bgm.file_path)
        if not bgm_path.is_file():
            await _fail_in_session(repo, mixed_audio_id, task_id, "BGM 文件不存在")
            await db.commit()
            return

        now = datetime.now(tz=UTC)
        await repo.update_asset_status(mixed_audio_id, status="mixing")
        await repo.update_task(
            task_id,
            status="mixing",
            progress=10,
            started_at=now,
        )
        await db.commit()

        podcast_input = podcast.audio_source_url
        podcast_duration = podcast.duration
        bgm_file = str(bgm_path)
        mix_cfg = mix_config

    output_dir = Path(settings.storage_root) / "mixed"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{mixed_audio_id}.mp3"

    playback_rate = max(0.6, min(2.0, float(mix_cfg.get("playback_rate", 1.0))))
    podcast_rate = max(
        0.6,
        min(2.0, float(mix_cfg.get("podcast_playback_rate", playback_rate))),
    )
    bgm_rate = max(
        0.6,
        min(2.0, float(mix_cfg.get("bgm_playback_rate", playback_rate))),
    )
    output_duration = max(1, int(podcast_duration / podcast_rate))

    cmd = build_mix_command(
        settings.ffmpeg_path,
        podcast_input,
        bgm_file,
        str(output_path),
        podcast_volume=float(mix_cfg.get("podcast_volume", 1.0)),
        bgm_volume=float(mix_cfg.get("bgm_volume", 0.15)),
        bgm_loop=bool(mix_cfg.get("bgm_loop", True)),
        duration_sec=output_duration,
        podcast_playback_rate=podcast_rate,
        bgm_playback_rate=bgm_rate,
        fade_in=max(0, min(30, int(mix_cfg.get("fade_in", 0) or 0))),
        fade_out=max(0, min(30, int(mix_cfg.get("fade_out", 0) or 0))),
    )

    try:
        exit_code = await _run_ffmpeg(cmd, output_duration, task_id, settings)
    except TimeoutError:
        await _mark_failed(mixed_audio_id, "合成超时（30 分钟）")
        output_path.unlink(missing_ok=True)
        return

    if exit_code != 0:
        await _mark_failed(mixed_audio_id, "音频合成失败，请稍后重试")
        output_path.unlink(missing_ok=True)
        return

    if not output_path.is_file():
        await _mark_failed(mixed_audio_id, "合成输出文件缺失")
        return

    try:
        probe = await probe_audio_file(settings.ffprobe_path, output_path)
        output_duration = probe.duration
    except (ValueError, OSError):
        output_duration = podcast_duration

    async with get_db_context() as db:
        repo = MixedAudioRepository(db)
        task = await repo.get_latest_task(mixed_audio_id)
        if task is None:
            return
        completed_at = datetime.now(tz=UTC)
        await repo.update_asset_status(
            mixed_audio_id,
            status="completed",
            output_file_path=str(output_path),
            error_message=None,
            duration=output_duration,
        )
        await repo.update_task(
            task.id,
            status="completed",
            progress=100,
            error_message=None,
            completed_at=completed_at,
        )
        await db.commit()

    logger.info("Mix completed", mixed_audio_id=mixed_audio_id, output=str(output_path))


async def _run_ffmpeg(
    cmd: list[str],
    total_duration: int,
    task_id: str,
    settings: AppSettings,
) -> int:
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )

    async def _read_stderr() -> None:
        assert proc.stderr is not None
        while True:
            line_bytes = await proc.stderr.readline()
            if not line_bytes:
                break
            line = line_bytes.decode(errors="ignore")
            current = parse_ffmpeg_time_seconds(line)
            if current is None:
                continue
            progress = estimate_progress(current, total_duration)
            async with get_db_context() as db:
                repo = MixedAudioRepository(db)
                await repo.update_task(task_id, progress=progress)
                await db.commit()

    stderr_task = asyncio.create_task(_read_stderr())
    try:
        await asyncio.wait_for(proc.wait(), timeout=settings.mix_timeout_seconds)
    finally:
        stderr_task.cancel()
        with suppress(asyncio.CancelledError):
            await stderr_task

    if proc.returncode is None:
        proc.kill()
        await proc.wait()
        raise TimeoutError

    return proc.returncode


async def _fail_in_session(
    repo: MixedAudioRepository,
    mixed_audio_id: str,
    task_id: str,
    message: str,
) -> None:
    completed_at = datetime.now(tz=UTC)
    await repo.update_asset_status(
        mixed_audio_id,
        status="failed",
        error_message=message,
    )
    await repo.update_task(
        task_id,
        status="failed",
        error_message=message,
        completed_at=completed_at,
    )


async def _mark_failed(mixed_audio_id: str, message: str) -> None:
    async with get_db_context() as db:
        repo = MixedAudioRepository(db)
        task = await repo.get_latest_task(mixed_audio_id)
        if task is None:
            return
        await _fail_in_session(repo, mixed_audio_id, task.id, message)
        await db.commit()
