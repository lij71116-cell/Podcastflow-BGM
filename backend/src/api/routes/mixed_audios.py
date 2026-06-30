"""组合音频创建与合成任务 API。"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from pycore.api.responses import success_response
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import Response

from src.api.deps import get_current_user_id
from src.core.config import get_settings
from src.db.session import get_db
from src.models.mixed_audio import (
    BatchDeleteMixedAudiosRequest,
    CreateMixedAudioRequest,
    PreviewMixRequest,
    RegenerateMixedAudioRequest,
)
from src.models.playback_progress import UpsertPlaybackProgressRequest
from src.services.mix_exceptions import (
    FFmpegUnavailableError,
    MixForbiddenError,
    MixInProgressError,
    MixPreviewError,
    MixResourceNotFoundError,
)
from src.services.mix_preview_service import MixPreviewService
from src.services.mixed_audio_service import MixedAudioService
from src.services.playback_progress_service import PlaybackProgressService

router = APIRouter(prefix="/api/mixed-audios", tags=["mixed-audios"])


@router.post("")
async def create_mixed_audio(
    body: CreateMixedAudioRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    try:
        data = await service.create(user_id, body)
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
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixPreviewService(db, get_settings())
    try:
        data = await service.create_preview(user_id, body)
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
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    service = MixPreviewService(db, get_settings())
    try:
        path = service.get_preview_path(user_id, preview_id)
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
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 10,
    q: Annotated[str | None, Query(max_length=256)] = None,
    created_date: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
    created_from: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
    created_to: Annotated[str | None, Query(pattern=r"^\d{4}-\d{2}-\d{2}$")] = None,
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    data = await service.list_assets(
        user_id,
        page=page,
        page_size=page_size,
        q=q,
        created_date=created_date,
        created_from=created_from,
        created_to=created_to,
    )
    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.delete("/batch")
async def delete_mixed_audios_batch(
    body: BatchDeleteMixedAudiosRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    data = await service.delete_batch(user_id, body.ids)
    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.post("/{mixed_audio_id}/regenerate")
async def regenerate_mixed_audio(
    mixed_audio_id: str,
    body: RegenerateMixedAudioRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    try:
        data = await service.regenerate(user_id, mixed_audio_id, body)
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
    except MixInProgressError as exc:
        return JSONResponse(
            status_code=409,
            content={"code": 40901, "message": str(exc), "data": None},
        )
    except FFmpegUnavailableError as exc:
        return JSONResponse(
            status_code=503,
            content={"code": 50301, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.get("/{mixed_audio_id}")
async def get_mixed_audio_detail(
    mixed_audio_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    try:
        data = await service.get_detail(user_id, mixed_audio_id)
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

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.delete("/{mixed_audio_id}")
async def delete_mixed_audio(
    mixed_audio_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    try:
        data = await service.delete(user_id, mixed_audio_id)
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

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.put("/{mixed_audio_id}/playback-progress")
async def upsert_playback_progress(
    mixed_audio_id: str,
    body: UpsertPlaybackProgressRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    if body.player_context not in {"global", "inline"}:
        return JSONResponse(
            status_code=400,
            content={"code": 40001, "message": "player_context 无效", "data": None},
        )

    service = PlaybackProgressService(db)
    try:
        data = await service.save_progress(user_id, mixed_audio_id, body)
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

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.get("/{mixed_audio_id}/playback-progress")
async def get_playback_progress(
    mixed_audio_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
    player_context: Annotated[str, Query(pattern=r"^(global|inline)$")],
) -> JSONResponse:
    service = PlaybackProgressService(db)
    try:
        data = await service.get_progress(user_id, mixed_audio_id, player_context)
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

    response = success_response(data.model_dump() if data else None)
    return JSONResponse(status_code=200, content=response.model_dump())


@router.get("/{mixed_audio_id}/stream", response_model=None)
async def stream_mixed_audio(
    mixed_audio_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    service = MixedAudioService(db, get_settings())
    try:
        path = await service.get_stream_file(user_id, mixed_audio_id)
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
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = MixedAudioService(db, get_settings())
    try:
        data = await service.get_task(user_id, mixed_audio_id)
    except MixForbiddenError as exc:
        return JSONResponse(
            status_code=403,
            content={"code": 40301, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())
