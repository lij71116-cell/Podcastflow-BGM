"""Podcast Flow 后端入口：基于 pycore APIServer。"""

from typing import cast

from fastapi import FastAPI
from pycore.api.server import APIConfig, APIServer
from pycore.core.logger import Logger, LoggerConfig, LogLevel, get_logger
from starlette.routing import Route

from src.api.routes.auth import router as auth_router
from src.api.routes.bgm import router as bgm_router
from src.api.routes.health import health_check
from src.api.routes.mixed_audios import router as mixed_audios_router
from src.api.routes.podcasts import router as podcasts_router
from src.core.config import get_settings, load_settings
from src.core.storage import ensure_storage_dirs
from src.db.session import close_db, init_db, init_engine
from src.middleware.auth import AuthMiddleware
from src.services.mix_worker import start_mix_worker

Logger.configure(
    LoggerConfig(level=LogLevel.INFO, app_name="podcast-flow", json_format=False)
)
logger = get_logger()


async def _startup() -> None:
    settings = get_settings()
    init_engine(settings.database_path)
    await init_db()
    ensure_storage_dirs(settings.storage_root)
    await start_mix_worker()
    if not settings.jwt_secret.strip():
        logger.warning("JWT_SECRET is empty — auth register/login will fail until configured")
    logger.info(
        "Podcast Flow backend started",
        host=settings.host,
        port=settings.port,
        debug=settings.debug,
    )


async def _shutdown() -> None:
    await close_db()


def _build_app() -> FastAPI:
    load_settings()
    settings = get_settings()

    server = APIServer(
        APIConfig(
            title="Podcast Flow API",
            description="为小宇宙播客添加 BGM 的组合音频服务",
            version="0.1.0",
            host=settings.host,
            port=settings.port,
            debug=settings.debug,
            cors_enabled=True,
            cors_origins=settings.cors_origins,
            cors_methods=["*"],
            cors_headers=["*"],
            startup_handlers=[_startup],
            shutdown_handlers=[_shutdown],
        )
    )
    application: FastAPI = cast(FastAPI, server.app)

    application.router.routes = [
        r
        for r in application.router.routes
        if not (isinstance(r, Route) and r.path == "/health")
    ]

    application.add_middleware(AuthMiddleware)
    application.add_api_route("/health", health_check, methods=["GET"], tags=["health"])
    application.include_router(auth_router)
    application.include_router(podcasts_router)
    application.include_router(bgm_router)
    application.include_router(mixed_audios_router)

    return application


app = _build_app()
