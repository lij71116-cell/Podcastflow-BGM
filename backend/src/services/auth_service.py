"""用户注册、登录与 JWT 签发。"""

from src.core.security import create_access_token, hash_password, verify_password
from src.db.models import User
from src.models.user import (
    AuthResponseData,
    ChangePasswordRequest,
    ChangePasswordResponse,
    LoginRequest,
    RegisterRequest,
    UserDTO,
)
from src.repositories.user_repository import UserRepository
from src.services.auth_exceptions import (
    EmailExistsError,
    InvalidCredentialsError,
    InvalidCurrentPasswordError,
    PasswordMismatchError,
    UsernameExistsError,
    UserNotFoundError,
)


def user_to_dto(user: User) -> UserDTO:
    return UserDTO(
        id=user.id,
        username=user.username,
        email=user.email,
        display_name=user.display_name,
        created_at=user.created_at.isoformat(),
    )


class AuthService:
    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo

    async def register(self, body: RegisterRequest) -> AuthResponseData:
        if body.password != body.password_confirm:
            raise PasswordMismatchError

        if await self._repo.get_by_username(body.username):
            raise UsernameExistsError

        email = str(body.email).lower()
        if await self._repo.get_by_email(email):
            raise EmailExistsError

        user = await self._repo.create(
            username=body.username,
            email=email,
            password_hash=hash_password(body.password),
        )
        token = create_access_token(user.id)
        return AuthResponseData(user=user_to_dto(user), token=token)

    async def login(self, body: LoginRequest) -> AuthResponseData:
        user: User | None
        if body.mode == "username":
            if not body.username:
                raise InvalidCredentialsError
            user = await self._repo.get_by_username(body.username)
        else:
            if not body.email:
                raise InvalidCredentialsError
            user = await self._repo.get_by_email(str(body.email).lower())

        if user is None or not verify_password(body.password, user.password_hash):
            raise InvalidCredentialsError

        token = create_access_token(user.id)
        return AuthResponseData(user=user_to_dto(user), token=token)

    async def get_current_user(self, user_id: str) -> UserDTO:
        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError
        return user_to_dto(user)

    async def change_password(
        self,
        user_id: str,
        body: ChangePasswordRequest,
    ) -> ChangePasswordResponse:
        if body.new_password != body.new_password_confirm:
            raise PasswordMismatchError

        user = await self._repo.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError

        if not verify_password(body.current_password, user.password_hash):
            raise InvalidCurrentPasswordError

        await self._repo.update_password_hash(user_id, hash_password(body.new_password))
        token = create_access_token(user_id)
        return ChangePasswordResponse(token=token)
