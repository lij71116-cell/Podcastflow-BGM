"""JWT 鉴权中间件：保护 /api/*（公开 Auth 与健康检查除外）。"""

from collections.abc import Callable
from typing import cast

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from src.core.config import get_settings
from src.core.security import decode_access_token

# 无需登录即可访问的 API 路径（精确匹配或前缀）
_PUBLIC_API_PATHS: frozenset[str] = frozenset(
    {
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/logout",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
    }
)


class AuthMiddleware(BaseHTTPMiddleware):
    """校验 JWT Cookie，为受保护路由注入 request.state.user_id。"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        if not path.startswith("/api"):
            return cast(Response, await call_next(request))

        if path in _PUBLIC_API_PATHS:
            return cast(Response, await call_next(request))

        settings = get_settings()
        token = request.cookies.get(settings.jwt_cookie_name)
        user_id = decode_access_token(token) if token else None
        if not user_id:
            return JSONResponse(
                status_code=401,
                content={
                    "code": 40101,
                    "message": "未登录或登录已失效",
                    "data": None,
                },
            )

        request.state.user_id = user_id
        return cast(Response, await call_next(request))
