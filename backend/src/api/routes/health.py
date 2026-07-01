"""健康检查路由。"""

import os
from typing import Annotated

from fastapi import Depends
from fastapi.responses import JSONResponse
from pycore.api.responses import success_response

from src.core.config import AppSettings, get_settings
from src.core.ffmpeg import is_ffmpeg_available
from src.core.persistence import is_data_volume_mounted, read_data_stats


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
    data_stats = read_data_stats(settings.database_path)
    volume_mounted = is_data_volume_mounted()
    persistence_ok = (
        settings.debug
        or (
            settings.database_path.startswith("/data/")
            and settings.storage_root.startswith("/data/")
            and volume_mounted
        )
    )
    response = success_response(
        {
            "status": "ok",
            "api_version": "2.0",
            "auth_enabled": True,
            "jwt_configured": jwt_configured,
            "env_keys_present": env_keys_present,
            "ffmpeg_available": ffmpeg_ok,
            "persistence": {
                "database_path": settings.database_path,
                "storage_root": settings.storage_root,
                "volume_mounted": volume_mounted,
                "persistence_ok": persistence_ok,
                "user_count": data_stats["user_count"],
                "mixed_audio_count": data_stats["mixed_audio_count"],
            },
        }
    )
    return JSONResponse(content=response.model_dump(), status_code=200)
