"""BGM 相关 Pydantic 模型。"""

from pydantic import BaseModel, Field


class ValidateBgmUrlRequest(BaseModel):
    source_url: str = Field(..., min_length=1, max_length=2048)


class ValidateQishuiShareRequest(BaseModel):
    share_url: str = Field(..., min_length=1, max_length=2048)


class BgmSourceResponse(BaseModel):
    id: str
    source_type: str
    source_url: str | None
    title: str
    duration: int
    format: str
    status: str
    cover_url: str = ""
    created_at: str
