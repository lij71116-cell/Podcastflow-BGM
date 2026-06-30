"""JWT 鉴权 API。"""

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pycore.api.responses import success_response
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user_id
from src.core.config import get_settings
from src.db.session import get_db
from src.models.user import ChangePasswordRequest, LoginRequest, RegisterRequest
from src.repositories.user_repository import UserRepository
from src.services.auth_exceptions import AuthConfigError, AuthError
from src.services.auth_service import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])

AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30  # 30 天


def _auth_error_response(exc: AuthError, status_code: int) -> JSONResponse:
    payload = {"code": exc.code, "message": exc.message, "data": None}
    return JSONResponse(status_code=status_code, content=payload)


def _set_auth_cookie(response: JSONResponse, token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        secure=not settings.debug,
        max_age=AUTH_COOKIE_MAX_AGE,
        path="/",
    )


@router.post("/register")
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = AuthService(UserRepository(db))
    try:
        data = await service.register(body)
        await db.commit()
    except AuthError as exc:
        await db.rollback()
        status = 500 if isinstance(exc, AuthConfigError) else 400 if exc.code >= 40000 and exc.code < 40100 else 401
        return _auth_error_response(exc, status)

    response = JSONResponse(status_code=200, content=success_response(data.model_dump()).model_dump())
    _set_auth_cookie(response, data.token)
    return response


@router.post("/login")
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = AuthService(UserRepository(db))
    try:
        data = await service.login(body)
        await db.commit()
    except AuthError as exc:
        await db.rollback()
        status = 500 if isinstance(exc, AuthConfigError) else 401
        return _auth_error_response(exc, status)

    response = JSONResponse(status_code=200, content=success_response(data.model_dump()).model_dump())
    _set_auth_cookie(response, data.token)
    return response


@router.post("/logout")
async def logout() -> JSONResponse:
    settings = get_settings()
    response = JSONResponse(
        status_code=200,
        content=success_response({"logged_out": True}).model_dump(),
    )
    response.delete_cookie(key=settings.jwt_cookie_name, path="/")
    return response


@router.get("/me")
async def me(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = AuthService(UserRepository(db))
    try:
        user = await service.get_current_user(user_id)
    except AuthError as exc:
        return _auth_error_response(exc, 401)

    return JSONResponse(status_code=200, content=success_response(user.model_dump()).model_dump())


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> JSONResponse:
    service = AuthService(UserRepository(db))
    try:
        data = await service.change_password(user_id, body)
        await db.commit()
    except AuthError as exc:
        await db.rollback()
        if exc.code == 40102 or exc.code == 40101:
            return _auth_error_response(exc, 401)
        return _auth_error_response(exc, 400)

    response = JSONResponse(status_code=200, content=success_response(data.model_dump()).model_dump())
    _set_auth_cookie(response, data.token)
    return response
