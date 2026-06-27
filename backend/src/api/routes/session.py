"""Session 探测路由（T-007 验收用，后续业务路由复用 session 依赖）。"""

from typing import Annotated, Any

from fastapi import APIRouter, Depends

from src.api.deps import get_session_id

router = APIRouter(prefix="/api", tags=["session"])


@router.get("/session")
async def get_current_session(
    session_id: Annotated[str, Depends(get_session_id)],
) -> dict[str, Any]:
    return {
        "code": 200,
        "message": "success",
        "data": {"session_id": session_id},
    }
