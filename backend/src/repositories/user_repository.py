"""用户数据访问。"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import User


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, user_id: str) -> User | None:
        result = await self._db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        result = await self._db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self._db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(
        self,
        *,
        username: str,
        email: str,
        password_hash: str,
        display_name: str | None = None,
    ) -> User:
        user = User(
            id=f"u_{uuid.uuid4()}",
            username=username,
            email=email.lower(),
            password_hash=password_hash,
            display_name=display_name or username,
        )
        self._db.add(user)
        await self._db.flush()
        return user

    async def update_password_hash(self, user_id: str, password_hash: str) -> User | None:
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.password_hash = password_hash
        await self._db.flush()
        return user
