"""播客相关 Pydantic 模型。"""

from pydantic import BaseModel, Field


class ParsePodcastRequest(BaseModel):
    source_url: str = Field(..., min_length=1, max_length=2048)


class PodcastSourceResponse(BaseModel):
    id: str
    source_type: str = "xiaoyuzhou_episode"
    source_url: str
    episode_id: str
    title: str
    podcast_name: str
    cover_url: str
    duration: int
    description: str
    created_at: str
