"""ffprobe 音频探测。"""

import asyncio
import json
import shutil
from dataclasses import dataclass
from pathlib import Path

from pycore.core.logger import get_logger

from src.services.bgm_exceptions import FfprobeUnavailableError

logger = get_logger()

ALLOWED_AUDIO_FORMATS = frozenset({"mp3", "m4a", "wav", "mov", "aac"})
FORMAT_ALIASES = {
    "mov": "m4a",
    "aac": "m4a",
    "mp4": "m4a",
}


@dataclass(frozen=True)
class AudioProbeResult:
    duration: int
    format: str


def ensure_ffprobe_available(ffprobe_path: str) -> None:
    if shutil.which(ffprobe_path) is None:
        raise FfprobeUnavailableError("音频探测服务不可用，请安装 FFmpeg（ffprobe）")


def _normalize_format(raw: str) -> str:
    fmt = raw.lower().strip()
    fmt = FORMAT_ALIASES.get(fmt, fmt)
    if fmt not in {"mp3", "m4a", "wav"}:
        raise ValueError(f"unsupported format: {raw}")
    return fmt


async def probe_audio_file(ffprobe_path: str, file_path: Path) -> AudioProbeResult:
    ensure_ffprobe_available(ffprobe_path)

    proc = await asyncio.create_subprocess_exec(
        ffprobe_path,
        "-v",
        "error",
        "-show_entries",
        "format=duration,format_name",
        "-of",
        "json",
        str(file_path),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    if proc.returncode != 0:
        detail = stderr.decode("utf-8", errors="ignore").strip()
        logger.warning("ffprobe failed", file_path=str(file_path), detail=detail)
        raise ValueError("ffprobe probe failed")

    payload = json.loads(stdout.decode("utf-8"))
    fmt_raw = str(payload.get("format", {}).get("format_name", "")).split(",")[0]
    duration_raw = payload.get("format", {}).get("duration", "0")
    fmt = _normalize_format(fmt_raw)
    duration = max(1, int(float(duration_raw)))
    return AudioProbeResult(duration=duration, format=fmt)
