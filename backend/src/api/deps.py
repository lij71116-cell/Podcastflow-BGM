"""API 依赖注入。"""

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

from src.core.config import get_settings
from src.core.security import decode_access_token


def get_current_user_id(request: Request) -> str:
    """从 AuthMiddleware 注入的 request.state 读取 user_id。"""
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": 40101, "message": "未登录或登录已失效"},
        )
    return str(user_id)


def get_optional_user_id(request: Request) -> str | None:
    """Auth 路由可选解析 JWT（公开路由不经过 AuthMiddleware）。"""
    settings = get_settings()
    token = request.cookies.get(settings.jwt_cookie_name)
    if not token:
        return None
    return decode_access_token(token)


def auth_error_json(code: int, message: str, status_code: int = 401) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"code": code, "message": message, "data": None},
    )
