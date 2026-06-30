"""播客解析 API。"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pycore.api.responses import success_response
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user_id
from src.core.config import get_settings
from src.core.podcast_stream import iter_podcast_upstream
from src.db.session import get_db
from src.models.podcast import ParsePodcastRequest
from src.services.podcast_exceptions import (
    PodcastNotFoundError,
    PodcastParseError,
    PodcastUrlInvalidError,
)
from src.services.podcast_service import PodcastService

router = APIRouter(prefix="/api/podcasts", tags=["podcasts"])


@router.post("/parse")
async def parse_podcast(
    body: ParsePodcastRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = PodcastService(db, get_settings())
    try:
        data = await service.parse_and_save(user_id, body.source_url)
    except PodcastUrlInvalidError as exc:
        payload = {"code": 40001, "message": str(exc), "data": None}
        return JSONResponse(status_code=400, content=payload)
    except PodcastParseError as exc:
        payload = {"code": 40002, "message": str(exc), "data": None}
        return JSONResponse(status_code=400, content=payload)

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.get("/{podcast_id}/cover", response_model=None)
async def get_podcast_cover(
    podcast_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    service = PodcastService(db, get_settings())
    try:
        path = await service.get_cover_file(user_id, podcast_id)
    except PodcastNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    media_type = "image/jpeg"
    if path.suffix.lower() == ".png":
        media_type = "image/png"
    elif path.suffix.lower() == ".webp":
        media_type = "image/webp"
    elif path.suffix.lower() == ".gif":
        media_type = "image/gif"

    return FileResponse(
        path,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/{podcast_id}/stream", response_model=None)
async def stream_podcast(
    podcast_id: str,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    service = PodcastService(db)
    try:
        audio_url = await service.get_audio_source_url(user_id, podcast_id)
        referer = await service.get_source_url(user_id, podcast_id)
    except PodcastNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    range_header = request.headers.get("range")
    status_code, response_headers, body = await iter_podcast_upstream(
        audio_url,
        range_header=range_header,
        referer=referer,
    )

    return StreamingResponse(
        body,
        status_code=status_code,
        media_type=response_headers.get("content-type", "audio/mpeg"),
        headers=response_headers,
    )
