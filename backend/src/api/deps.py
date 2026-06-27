"""API 依赖注入。"""

from fastapi import HTTPException, Request, status


def get_session_id(request: Request) -> str:
    """从 SessionMiddleware 注入的 request.state 读取 session_id。"""
    session_id = getattr(request.state, "session_id", None)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session required",
        )
    return str(session_id)
