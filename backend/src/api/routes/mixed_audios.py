"""组合音频创建与合成任务 API。"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from pycore.api.responses import success_response
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response

from src.api.deps import get_session_id
from src.core.config import get_settings
from src.db.session import get_db
from src.models.mixed_audio import CreateMixedAudioRequest, PreviewMixRequest
from src.services.mix_exceptions import (
    FFmpegUnavailableError,
    MixForbiddenError,
    MixPreviewError,
    MixResourceNotFoundError,
)
from src.services.mix_preview_service import MixPreviewService
from src.services.mixed_audio_service import MixedAudioService

router = APIRouter(prefix="/api/mixed-audios", tags=["mixed-audios"])


@router.post("")
async def create_mixed_audio(
    body: CreateMixedAudioRequest,
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    try:
        data = await service.create(session_id, body)
    except MixResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content={"code": 40401, "message": str(exc), "data": None},
        )
    except FFmpegUnavailableError as exc:
        return JSONResponse(
            status_code=503,
            content={"code": 50301, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.post("/preview")
async def create_mix_preview(
    body: PreviewMixRequest,
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixPreviewService(db, get_settings())
    try:
        data = await service.create_preview(session_id, body)
    except MixResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content={"code": 40401, "message": str(exc), "data": None},
        )
    except FFmpegUnavailableError as exc:
        return JSONResponse(
            status_code=503,
            content={"code": 50301, "message": str(exc), "data": None},
        )
    except MixPreviewError as exc:
        return JSONResponse(
            status_code=500,
            content={"code": 50002, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.get("/preview/{preview_id}/stream", response_model=None)
async def stream_mix_preview(
    preview_id: str,
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    service = MixPreviewService(db, get_settings())
    try:
        path = service.get_preview_path(session_id, preview_id)
    except MixForbiddenError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    return FileResponse(
        path,
        media_type="audio/mpeg",
        filename="preview.mp3",
        headers={"Content-Disposition": "inline; filename=preview.mp3"},
    )


@router.get("")
async def list_mixed_audios(
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    data = await service.list_assets(session_id)
    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.get("/{mixed_audio_id}")
async def get_mixed_audio_detail(
    mixed_audio_id: str,
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    try:
        data = await service.get_detail(session_id, mixed_audio_id)
    except MixResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content={"code": 40401, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.delete("/{mixed_audio_id}")
async def delete_mixed_audio(
    mixed_audio_id: str,
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    try:
        data = await service.delete(session_id, mixed_audio_id)
    except MixResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content={"code": 40401, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.get("/{mixed_audio_id}/stream", response_model=None)
async def stream_mixed_audio(
    mixed_audio_id: str,
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    service = MixedAudioService(db, get_settings())
    try:
        path = await service.get_stream_file(session_id, mixed_audio_id)
    except MixResourceNotFoundError as exc:
        return JSONResponse(
            status_code=404,
            content={"code": 40401, "message": str(exc), "data": None},
        )
    except MixForbiddenError as exc:
        return JSONResponse(
            status_code=403,
            content={"code": 40301, "message": str(exc), "data": None},
        )

    return FileResponse(
        path,
        media_type="audio/mpeg",
        filename="mixed.mp3",
        headers={
            "Content-Disposition": "inline; filename=mixed.mp3",
            "Accept-Ranges": "bytes",
        },
    )


@router.get("/{mixed_audio_id}/task")
async def get_mix_task(
    mixed_audio_id: str,
    session_id: Annotated[str, Depends(get_session_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    try:
        data = await service.get_task(session_id, mixed_audio_id)
    except MixForbiddenError as exc:
        return JSONResponse(
            status_code=403,
            content={"code": 40301, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())
