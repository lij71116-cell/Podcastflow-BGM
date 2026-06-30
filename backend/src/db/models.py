"""
Podcast Flow 业务 ORM 模型。

对应 PRD 第 6 章：PodcastSource、BgmSource、MixedAudioAsset、MixTask、Session。
MixConfig 以 JSON 字符串存储在 mixed_audio_assets.mix_config。
"""

from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


def _now() -> datetime:
    return datetime.now(tz=UTC)


class User(Base):
    """登录用户（V2 JWT 鉴权）。"""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class AppSession(Base):
    """浏览器 Session（Cookie 隔离）。"""

    __tablename__ = "sessions"

    session_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    podcast_sources: Mapped[list["PodcastSource"]] = relationship(back_populates="session")
    bgm_sources: Mapped[list["BgmSource"]] = relationship(back_populates="session")
    mixed_audio_assets: Mapped[list["MixedAudioAsset"]] = relationship(back_populates="session")


class PodcastSource(Base):
    __tablename__ = "podcast_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    session_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sessions.session_id"), nullable=True
    )
    source_type: Mapped[str] = mapped_column(String(32), default="xiaoyuzhou_episode")
    source_url: Mapped[str] = mapped_column(String(2048))
    episode_id: Mapped[str] = mapped_column(String(128))
    title: Mapped[str] = mapped_column(String(512))
    podcast_name: Mapped[str] = mapped_column(String(256))
    cover_url: Mapped[str] = mapped_column(String(2048), default="")
    duration: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    audio_source_url: Mapped[str] = mapped_column(String(2048), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    session: Mapped["AppSession"] = relationship(back_populates="podcast_sources")
    mixed_assets: Mapped[list["MixedAudioAsset"]] = relationship(back_populates="podcast_source")

    __table_args__ = (
        Index("ix_podcast_sources_session_id", "session_id"),
        Index("ix_podcast_sources_user_id", "user_id"),
    )


class BgmSource(Base):
    __tablename__ = "bgm_sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    session_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sessions.session_id"), nullable=True
    )
    source_type: Mapped[str] = mapped_column(String(16))  # upload / url
    source_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    file_path: Mapped[str] = mapped_column(String(1024), default="")
    title: Mapped[str] = mapped_column(String(256))
    cover_url: Mapped[str] = mapped_column(String(2048), default="")
    duration: Mapped[int] = mapped_column(Integer)
    format: Mapped[str] = mapped_column(String(16), default="mp3")
    status: Mapped[str] = mapped_column(String(16), default="available")  # available / unavailable
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    session: Mapped["AppSession"] = relationship(back_populates="bgm_sources")
    mixed_assets: Mapped[list["MixedAudioAsset"]] = relationship(back_populates="bgm_source")

    __table_args__ = (
        Index("ix_bgm_sources_session_id", "session_id"),
        Index("ix_bgm_sources_user_id", "user_id"),
    )


class MixedAudioAsset(Base):
    __tablename__ = "mixed_audio_assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    session_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("sessions.session_id"), nullable=True
    )
    podcast_source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("podcast_sources.id")
    )
    bgm_source_id: Mapped[str] = mapped_column(String(36), ForeignKey("bgm_sources.id"))
    title: Mapped[str] = mapped_column(String(512))
    duration: Mapped[int] = mapped_column(Integer, default=0)
    mix_config: Mapped[str] = mapped_column(Text, default="{}")  # JSON MixConfig
    status: Mapped[str] = mapped_column(String(16), default="pending")
    output_file_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now, onupdate=_now
    )

    session: Mapped["AppSession"] = relationship(back_populates="mixed_audio_assets")
    podcast_source: Mapped["PodcastSource"] = relationship(back_populates="mixed_assets")
    bgm_source: Mapped["BgmSource"] = relationship(back_populates="mixed_assets")
    mix_tasks: Mapped[list["MixTask"]] = relationship(back_populates="mixed_audio")

    __table_args__ = (
        Index("ix_mixed_audio_assets_session_id", "session_id"),
        Index("ix_mixed_audio_assets_user_id", "user_id"),
    )


class MixTask(Base):
    __tablename__ = "mix_tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    mixed_audio_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("mixed_audio_assets.id")
    )
    status: Mapped[str] = mapped_column(String(16), default="pending")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    mixed_audio: Mapped["MixedAudioAsset"] = relationship(back_populates="mix_tasks")

    __table_args__ = (Index("ix_mix_tasks_mixed_audio_id", "mixed_audio_id"),)


class PlaybackProgress(Base):
    """用户播放进度（全局播放器 / 详情内嵌播放器分别记忆）。"""

    __tablename__ = "playback_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    mixed_audio_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("mixed_audio_assets.id", ondelete="CASCADE"),
    )
    player_context: Mapped[str] = mapped_column(String(16))
    position_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "mixed_audio_id",
            "player_context",
            name="uq_playback_progress_user_asset_ctx",
        ),
        Index("ix_playback_progress_mixed_audio_id", "mixed_audio_id"),
    )
