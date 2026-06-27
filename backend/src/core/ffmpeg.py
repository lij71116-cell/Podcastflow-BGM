"""外部工具检测（FFmpeg 等）。"""

import shutil


def is_ffmpeg_available(ffmpeg_path: str, ffprobe_path: str) -> bool:
    """检测 ffmpeg 与 ffprobe 可执行文件是否可用。"""
    return shutil.which(ffmpeg_path) is not None and shutil.which(ffprobe_path) is not None
