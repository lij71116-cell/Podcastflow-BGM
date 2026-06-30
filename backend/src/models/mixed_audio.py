"""组合音频与合成任务 Pydantic 模型。"""

from pydantic import BaseModel, Field


class MixConfigDTO(BaseModel):
    podcast_volume: float = Field(..., ge=0.0, le=2.0)
    podcast_playback_rate: float = Field(default=1.0, ge=0.6, le=2.0)
    bgm_volume: float = Field(..., ge=0.0, le=2.0)
    bgm_playback_rate: float = Field(default=1.0, ge=0.6, le=2.0)
    bgm_loop: bool
    fade_in: int = Field(default=0, ge=0, le=30)
    fade_out: int = Field(default=0, ge=0, le=30)


class CreateMixedAudioRequest(BaseModel):
    podcast_source_id: str = Field(..., min_length=1)
    bgm_source_id: str = Field(..., min_length=1)
    mix_config: MixConfigDTO
    title: str | None = Field(default=None, max_length=512)


class PodcastBriefResponse(BaseModel):
    id: str
    title: str
    podcast_name: str
    cover_url: str
    source_url: str
    description: str = ""


class BgmBriefResponse(BaseModel):
    id: str
    title: str
    source_type: str
    duration: int
    cover_url: str = ""


class MixedAudioAssetResponse(BaseModel):
    id: str
    title: str
    duration: int
    status: str
    play_url: str
    download_enabled: bool = False
    created_at: str
    updated_at: str
    podcast: PodcastBriefResponse
    bgm: BgmBriefResponse
    mix_config: MixConfigDTO
    error_message: str | None = None


class MixTaskResponse(BaseModel):
    id: str
    mixed_audio_id: str
    status: str
    progress: int
    error_message: str | None
    started_at: str | None
    completed_at: str | None


class CreateMixedAudioResponse(BaseModel):
    mixed_audio: MixedAudioAssetResponse
    task: MixTaskResponse


class MixedAudioListResponse(BaseModel):
    items: list[MixedAudioAssetResponse]
    total: int
    page: int = 1
    page_size: int = 10


class BatchDeleteMixedAudiosRequest(BaseModel):
    ids: list[str] = Field(..., min_length=1)


class BatchDeleteMixedAudiosResponse(BaseModel):
    deleted_count: int
    deleted_ids: list[str]


class RegenerateMixedAudioRequest(BaseModel):
    mix_config: MixConfigDTO
    bgm_id: str | None = Field(default=None, min_length=1)


class DeleteMixedAudioResponse(BaseModel):
    deleted: bool
    id: str


class PreviewMixRequest(BaseModel):
    podcast_source_id: str = Field(..., min_length=1)
    bgm_source_id: str = Field(..., min_length=1)
    mix_config: MixConfigDTO
    start_sec: int = Field(default=0, ge=0)
    duration_sec: int | None = Field(
        default=None,
        ge=5,
        description="试听时长（秒）；省略或为 null 时使用播客剩余全长",
    )


class PreviewMixResponse(BaseModel):
    preview_id: str
    play_url: str
    duration: int
    start_sec: int
