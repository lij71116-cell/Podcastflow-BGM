"""用户相关 Pydantic 模型。"""

from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class UserDTO(BaseModel):
    id: str
    username: str
    email: str
    display_name: str
    created_at: str


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=8)
    password_confirm: str = Field(..., min_length=8)


class LoginRequest(BaseModel):
    mode: Literal["username", "email"]
    username: str | None = None
    email: EmailStr | None = None
    password: str = Field(..., min_length=1)


class AuthResponseData(BaseModel):
    user: UserDTO
    token: str


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    new_password_confirm: str = Field(..., min_length=8)


class ChangePasswordResponse(BaseModel):
    password_changed: bool = True
    token: str
