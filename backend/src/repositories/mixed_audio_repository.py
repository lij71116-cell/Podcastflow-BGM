"""MixedAudioAsset 与 MixTask 数据访问。"""

import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.models import MixedAudioAsset, MixTask


class MixedAudioRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def create_with_task(
        self,
        *,
        session_id: str,
        podcast_source_id: str,
        bgm_source_id: str,
        title: str,
        duration: int,
        mix_config: dict[str, object],
    ) -> tuple[MixedAudioAsset, MixTask]:
        asset_id = str(uuid.uuid4())
        task_id = str(uuid.uuid4())
        now = datetime.now(tz=UTC)

        asset = MixedAudioAsset(
            id=asset_id,
            session_id=session_id,
            podcast_source_id=podcast_source_id,
            bgm_source_id=bgm_source_id,
            title=title,
            duration=duration,
            mix_config=json.dumps(mix_config),
            status="pending",
            created_at=now,
            updated_at=now,
        )
        task = MixTask(
            id=task_id,
            mixed_audio_id=asset_id,
            status="pending",
            progress=0,
        )
        self._db.add(asset)
        self._db.add(task)
        await self._db.flush()
        await self._db.refresh(asset)
        await self._db.refresh(task)
        return asset, task

    async def get_asset_with_relations(
        self,
        session_id: str,
        mixed_audio_id: str,
    ) -> MixedAudioAsset | None:
        result = await self._db.execute(
            select(MixedAudioAsset)
            .options(
                selectinload(MixedAudioAsset.podcast_source),
                selectinload(MixedAudioAsset.bgm_source),
                selectinload(MixedAudioAsset.mix_tasks),
            )
            .where(
                MixedAudioAsset.id == mixed_audio_id,
                MixedAudioAsset.session_id == session_id,
            )
        )
        return result.scalar_one_or_none()

    async def list_by_session(self, session_id: str) -> list[MixedAudioAsset]:
        result = await self._db.execute(
            select(MixedAudioAsset)
            .options(
                selectinload(MixedAudioAsset.podcast_source),
                selectinload(MixedAudioAsset.bgm_source),
            )
            .where(MixedAudioAsset.session_id == session_id)
            .order_by(MixedAudioAsset.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_latest_task(self, mixed_audio_id: str) -> MixTask | None:
        result = await self._db.execute(
            select(MixTask)
            .where(MixTask.mixed_audio_id == mixed_audio_id)
            .order_by(MixTask.id.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def list_recoverable_mixed_ids(self) -> list[str]:
        """返回 pending/mixing 状态、需恢复合成的 mixed_audio_id。"""
        result = await self._db.execute(
            select(MixedAudioAsset.id).where(
                MixedAudioAsset.status.in_(("pending", "mixing"))
            )
        )
        return [row[0] for row in result.all()]

    async def update_asset_status(
        self,
        mixed_audio_id: str,
        *,
        status: str,
        output_file_path: str | None = None,
        error_message: str | None = None,
        duration: int | None = None,
    ) -> None:
        result = await self._db.execute(
            select(MixedAudioAsset).where(MixedAudioAsset.id == mixed_audio_id)
        )
        asset = result.scalar_one()
        asset.status = status
        asset.updated_at = datetime.now(tz=UTC)
        if output_file_path is not None:
            asset.output_file_path = output_file_path
        if error_message is not None:
            asset.error_message = error_message
        if duration is not None:
            asset.duration = duration
        await self._db.flush()

    async def update_task(
        self,
        task_id: str,
        *,
        status: str | None = None,
        progress: int | None = None,
        error_message: str | None = None,
        started_at: datetime | None = None,
        completed_at: datetime | None = None,
    ) -> None:
        result = await self._db.execute(select(MixTask).where(MixTask.id == task_id))
        task = result.scalar_one()
        if status is not None:
            task.status = status
        if progress is not None:
            task.progress = progress
        if error_message is not None:
            task.error_message = error_message
        if started_at is not None:
            task.started_at = started_at
        if completed_at is not None:
            task.completed_at = completed_at
        await self._db.flush()

    async def delete_by_session(
        self,
        session_id: str,
        mixed_audio_id: str,
    ) -> MixedAudioAsset | None:
        asset = await self.get_asset_with_relations(session_id, mixed_audio_id)
        if asset is None:
            return None

        for task in list(asset.mix_tasks):
            await self._db.delete(task)
        await self._db.delete(asset)
        await self._db.flush()
        return asset
