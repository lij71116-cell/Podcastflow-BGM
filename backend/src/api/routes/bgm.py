"""BGM 上传与链接校验 API。"""

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from pycore.api.responses import success_response
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user_id
from src.core.config import get_settings
from src.db.session import get_db
from src.models.bgm import ValidateBgmUrlRequest, ValidateQishuiShareRequest
from src.services.bgm_exceptions import (
    BgmFormatError,
    BgmNotFoundError,
    BgmTooLargeError,
    BgmUrlUnavailableError,
    FfprobeUnavailableError,
    QishuiPaidTrackError,
    QishuiParseError,
    QishuiUrlInvalidError,
)
from src.services.bgm_service import BgmService

router = APIRouter(prefix="/api/bgm", tags=["bgm"])


@router.post("/upload")
async def upload_bgm(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: Annotated[UploadFile, File(...)],
) -> JSONResponse:
    content = await file.read()
    service = BgmService(db, get_settings())
    try:
        data = await service.upload_file(user_id, file.filename or "bgm.mp3", content)
    except BgmFormatError as exc:
        return JSONResponse(
            status_code=400,
            content={"code": 40003, "message": str(exc), "data": None},
        )
    except BgmTooLargeError as exc:
        return JSONResponse(
            status_code=400,
            content={"code": 40004, "message": str(exc), "data": None},
        )
    except FfprobeUnavailableError as exc:
        return JSONResponse(
            status_code=503,
            content={"code": 50301, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.post("/validate-url")
async def validate_bgm_url(
    body: ValidateBgmUrlRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = BgmService(db, get_settings())
    try:
        data = await service.validate_and_download_url(user_id, body.source_url)
    except BgmTooLargeError as exc:
        return JSONResponse(
            status_code=400,
            content={"code": 40004, "message": str(exc), "data": None},
        )
    except BgmUrlUnavailableError as exc:
        return JSONResponse(
            status_code=400,
            content={"code": 40005, "message": str(exc), "data": None},
        )
    except FfprobeUnavailableError as exc:
        return JSONResponse(
            status_code=503,
            content={"code": 50301, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.post("/validate-qishui")
async def validate_qishui_share(
    body: ValidateQishuiShareRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = BgmService(db, get_settings())
    try:
        data = await service.validate_qishui_share(user_id, body.share_url)
    except QishuiUrlInvalidError as exc:
        return JSONResponse(
            status_code=400,
            content={"code": 40007, "message": str(exc), "data": None},
        )
    except QishuiParseError as exc:
        return JSONResponse(
            status_code=400,
            content={"code": 40008, "message": str(exc), "data": None},
        )
    except QishuiPaidTrackError as exc:
        return JSONResponse(
            status_code=400,
            content={"code": 40009, "message": str(exc), "data": None},
        )
    except BgmTooLargeError as exc:
        return JSONResponse(
            status_code=400,
            content={"code": 40004, "message": str(exc), "data": None},
        )
    except BgmUrlUnavailableError as exc:
        return JSONResponse(
            status_code=400,
            content={"code": 40005, "message": str(exc), "data": None},
        )
    except FfprobeUnavailableError as exc:
        return JSONResponse(
            status_code=503,
            content={"code": 50301, "message": str(exc), "data": None},
        )

    response = success_response(data.model_dump())
    return JSONResponse(status_code=200, content=response.model_dump())


@router.get("/{bgm_id}/stream", response_model=None)
async def stream_bgm(
    bgm_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    service = BgmService(db, get_settings())
    try:
        path, mime = await service.get_stream_file(user_id, bgm_id)
    except BgmNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FileResponse(
        path,
        media_type=mime,
        filename=f"bgm.{path.suffix.lstrip('.')}",
        headers={"Content-Disposition": "inline"},
    )


@router.get("/{bgm_id}/cover", response_model=None)
async def get_bgm_cover(
    bgm_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> FileResponse:
    service = BgmService(db, get_settings())
    try:
        path = await service.get_cover_file(user_id, bgm_id)
    except BgmNotFoundError as exc:
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
