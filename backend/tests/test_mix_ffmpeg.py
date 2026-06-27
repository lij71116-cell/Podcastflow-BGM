"""mix_ffmpeg 命令构建测试。"""

from src.core.mix_ffmpeg import build_mix_command


def test_build_mix_command_with_independent_playback_rates() -> None:
    cmd = build_mix_command(
        "ffmpeg",
        "podcast.m4a",
        "bgm.mp3",
        "out.mp3",
        podcast_volume=1.0,
        bgm_volume=0.15,
        bgm_loop=True,
        duration_sec=120,
        podcast_playback_rate=1.5,
        bgm_playback_rate=0.8,
    )
    joined = " ".join(cmd)
    assert "atempo=1.5" in joined
    assert "atempo=0.8" in joined


def test_build_mix_command_default_speed_omits_atempo() -> None:
    cmd = build_mix_command(
        "ffmpeg",
        "podcast.m4a",
        "bgm.mp3",
        "out.mp3",
        podcast_volume=1.0,
        bgm_volume=0.15,
        bgm_loop=False,
        duration_sec=60,
    )
    assert "atempo" not in " ".join(cmd)
