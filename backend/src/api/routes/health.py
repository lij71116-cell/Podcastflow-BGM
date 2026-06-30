"""健康检查路由。"""

import os
from typing import Annotated

from fastapi import Depends
from fastapi.responses import JSONResponse
from pycore.api.responses import success_response

from src.core.config import AppSettings, get_settings
from src.core.ffmpeg import is_ffmpeg_available


async def health_check(
    settings: Annotated[AppSettings, Depends(get_settings)],
) -> JSONResponse:
    ffmpeg_ok = is_ffmpeg_available(settings.ffmpeg_path, settings.ffprobe_path)
    jwt_configured = bool(settings.jwt_secret.strip())
    env_keys_present = [
        key
        for key in ("HOST", "DEBUG", "JWT_SECRET", "DATABASE_PATH", "STORAGE_ROOT", "CORS_ORIGINS", "PORT")
        if os.environ.get(key)
    ]
    response = success_response(
        {
            "status": "ok",
            "api_version": "2.0",
            "auth_enabled": True,
            "jwt_configured": jwt_configured,
            "env_keys_present": env_keys_present,
            "ffmpeg_available": ffmpeg_ok,
        }
    )
    return JSONResponse(content=response.model_dump(), status_code=200)
