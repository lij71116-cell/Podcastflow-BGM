"""播放进度 Pydantic 模型。"""

from typing import Literal

from pydantic import BaseModel, Field

PlayerContext = Literal["global", "inline"]


class UpsertPlaybackProgressRequest(BaseModel):
    player_context: PlayerContext
    position_seconds: float = Field(..., ge=0)
    duration_seconds: float | None = Field(default=None, ge=0)


class PlaybackProgressResponse(BaseModel):
    mixed_audio_id: str
    player_context: str
    position_seconds: float
    duration_seconds: float | None = None
    updated_at: str
