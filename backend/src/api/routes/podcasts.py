"""播客解析 API。"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pycore.api.responses import success_response
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_session_id
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
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = PodcastService(db)
    try:
        data = await service.parse_and_save(session_id, body.source_url)
    except PodcastUrlInvalidError as exc:
        payload = {"code": 40001, "message": str(exc), "data": None}
        return JSONResponse(status_code=400, content=payload)
    except PodcastParseError as exc:
        payload = {"code": 40002, "message": str(exc), "data": None}
        return JSONResponse(status_code=400, content=payload)

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.get("/{podcast_id}/stream", response_model=None)
async def stream_podcast(
    podcast_id: str,
    request: Request,
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> StreamingResponse:
    service = PodcastService(db)
    try:
        audio_url = await service.get_audio_source_url(session_id, podcast_id)
        referer = await service.get_source_url(session_id, podcast_id)
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
