"""FFmpeg 混音命令构建与进度解析。"""

import re

_TIME_RE = re.compile(r"time=(\d+):(\d+):(\d+(?:\.\d+)?)")


def _clamp_rate(rate: float) -> float:
    return max(0.6, min(2.0, rate))


def _track_filter(volume: float, playback_rate: float) -> str:
    vol = max(0.0, volume)
    speed = _clamp_rate(playback_rate)
    if abs(speed - 1.0) < 0.001:
        return f"volume={vol}"
    return f"atempo={speed},volume={vol}"


def build_mix_command(
    ffmpeg_path: str,
    podcast_input: str,
    bgm_path: str,
    output_path: str,
    *,
    podcast_volume: float,
    bgm_volume: float,
    bgm_loop: bool,
    duration_sec: int,
    start_sec: int = 0,
    podcast_playback_rate: float = 1.0,
    bgm_playback_rate: float = 1.0,
) -> list[str]:
    """构建 FFmpeg 混音命令（播客 + BGM → mp3）。"""
    filter_complex = (
        f"[0:a]{_track_filter(podcast_volume, podcast_playback_rate)}[p];"
        f"[1:a]{_track_filter(bgm_volume, bgm_playback_rate)}[b];"
        f"[p][b]amix=inputs=2:duration=first:dropout_transition=0[out]"
    )
    args: list[str] = [
        ffmpeg_path,
        "-y",
    ]
    if start_sec > 0:
        args.extend(["-ss", str(start_sec)])
    args.extend(["-i", podcast_input])
    if bgm_loop:
        args.extend(["-stream_loop", "-1"])
    args.extend(
        [
            "-i",
            bgm_path,
            "-filter_complex",
            filter_complex,
            "-map",
            "[out]",
            "-t",
            str(max(1, duration_sec)),
            "-c:a",
            "libmp3lame",
            "-q:a",
            "2",
            output_path,
        ]
    )
    return args


def parse_ffmpeg_time_seconds(line: str) -> float | None:
    """从 ffmpeg stderr 行解析当前处理时间（秒）。"""
    match = _TIME_RE.search(line)
    if not match:
        return None
    hours = int(match.group(1))
    minutes = int(match.group(2))
    seconds = float(match.group(3))
    return hours * 3600 + minutes * 60 + seconds


def estimate_progress(current_sec: float, total_sec: int) -> int:
    """根据已处理时长估算进度（30–95）。"""
    if total_sec <= 0:
        return 50
    ratio = min(1.0, max(0.0, current_sec / total_sec))
    return int(30 + ratio * 65)
