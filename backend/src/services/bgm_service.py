"""BGM 上传与链接校验业务服务。"""

import re
import uuid
from pathlib import Path
from urllib.parse import unquote, urlparse

import httpx
from pycore.core.logger import get_logger
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.config import AppSettings, get_settings
from src.core.ffprobe import probe_audio_file
from src.models.bgm import BgmSourceResponse
from src.repositories.bgm_repository import BgmRepository
from src.services.bgm_exceptions import (
    BgmFormatError,
    BgmNotFoundError,
    BgmTooLargeError,
    BgmUrlUnavailableError,
    FfprobeUnavailableError,
)

logger = get_logger()

ALLOWED_EXTENSIONS = frozenset({".mp3", ".m4a", ".wav"})
EXTENSION_FROM_CONTENT_TYPE = {
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/x-m4a": ".m4a",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/wave": ".wav",
    "video/mp4": ".m4a",
}
MIME_TYPE_QUERY_PATTERN = re.compile(r"mime_type=([^&]+)")


def _to_response(entity: object) -> BgmSourceResponse:
    from src.db.models import BgmSource

    assert isinstance(entity, BgmSource)
    return BgmSourceResponse(
        id=entity.id,
        source_type=entity.source_type,
        source_url=entity.source_url,
        title=entity.title,
        duration=entity.duration,
        format=entity.format,
        status=entity.status,
        created_at=entity.created_at.isoformat(),
    )


def _bgm_dir(settings: AppSettings) -> Path:
    path = Path(settings.storage_root) / "bgm"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise BgmFormatError("BGM 格式不支持，仅支持 mp3 / m4a / wav")
    return ext


def _title_from_filename(filename: str) -> str:
    stem = Path(filename).stem.strip()
    return stem or "BGM"


def _title_from_url(url: str) -> str:
    path = unquote(urlparse(url).path)
    name = Path(path).stem.strip()
    return name or "BGM"


def _guess_extension_from_url(url: str, content_type: str | None) -> str:
    path_ext = Path(unquote(urlparse(url).path)).suffix.lower()
    if path_ext in ALLOWED_EXTENSIONS:
        return path_ext
    if content_type:
        ct = content_type.split(";")[0].strip().lower()
        ext = EXTENSION_FROM_CONTENT_TYPE.get(ct)
        if ext:
            return ext
    raise BgmUrlUnavailableError("BGM 链接不可用，请重新上传或更换链接")


def _guess_extension_from_media_url(url: str, content_type: str | None) -> str:
    match = MIME_TYPE_QUERY_PATTERN.search(url)
    if match:
        mime = match.group(1).lower()
        if mime in ("audio_mp4", "video_mp4"):
            return ".m4a"
        mapped = EXTENSION_FROM_CONTENT_TYPE.get(mime.replace("_", "/"))
        if mapped:
            return mapped
    return _guess_extension_from_url(url, content_type)


class BgmService:
    def __init__(self, db: AsyncSession, settings: AppSettings | None = None) -> None:
        self._db = db
        self._settings = settings or get_settings()
        self._repo = BgmRepository(db)

    async def upload_file(
        self,
        session_id: str,
        filename: str,
        content: bytes,
    ) -> BgmSourceResponse:
        ext = _validate_extension(filename)
        max_bytes = self._settings.max_bgm_file_size_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise BgmTooLargeError("BGM 文件过大，最大支持 50MB")

        bgm_id = str(uuid.uuid4())
        dest = _bgm_dir(self._settings) / f"{bgm_id}{ext}"
        dest.write_bytes(content)

        try:
            probe = await probe_audio_file(self._settings.ffprobe_path, dest)
        except FfprobeUnavailableError:
            dest.unlink(missing_ok=True)
            raise
        except ValueError as exc:
            dest.unlink(missing_ok=True)
            logger.warning("BGM upload probe failed", filename=filename, detail=str(exc))
            raise BgmFormatError("BGM 格式不支持，仅支持 mp3 / m4a / wav") from exc

        entity = await self._repo.create(
            session_id=session_id,
            source_type="upload",
            source_url=None,
            file_path=str(dest),
            title=_title_from_filename(filename),
            duration=probe.duration,
            fmt=probe.format,
        )
        await self._db.commit()
        return _to_response(entity)

    async def validate_and_download_url(
        self,
        session_id: str,
        source_url: str,
    ) -> BgmSourceResponse:
        url = source_url.strip()
        if not url.startswith("http://") and not url.startswith("https://"):
            raise BgmUrlUnavailableError("BGM 链接不可用，请重新上传或更换链接")

        try:
            async with httpx.AsyncClient(
                trust_env=False,
                timeout=30.0,
                follow_redirects=True,
            ) as client:
                response = await client.get(url)
        except httpx.HTTPError as exc:
            logger.warning("BGM url fetch failed", source_url=url, detail=str(exc))
            raise BgmUrlUnavailableError("BGM 链接不可用，请重新上传或更换链接") from exc

        if response.status_code >= 400:
            raise BgmUrlUnavailableError("BGM 链接不可用，请重新上传或更换链接")

        content_type = response.headers.get("content-type")
        try:
            ext = _guess_extension_from_url(url, content_type)
        except BgmUrlUnavailableError:
            raise

        content = response.content
        max_bytes = self._settings.max_bgm_file_size_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise BgmTooLargeError("BGM 文件过大，最大支持 50MB")
        if not content:
            raise BgmUrlUnavailableError("BGM 链接不可用，请重新上传或更换链接")

        bgm_id = str(uuid.uuid4())
        dest = _bgm_dir(self._settings) / f"{bgm_id}{ext}"
        dest.write_bytes(content)

        try:
            probe = await probe_audio_file(self._settings.ffprobe_path, dest)
        except FfprobeUnavailableError:
            dest.unlink(missing_ok=True)
            raise
        except ValueError as exc:
            dest.unlink(missing_ok=True)
            logger.warning("BGM url probe failed", source_url=url, detail=str(exc))
            raise BgmUrlUnavailableError("BGM 链接不可用，请重新上传或更换链接") from exc

        entity = await self._repo.create(
            session_id=session_id,
            source_type="url",
            source_url=url,
            file_path=str(dest),
            title=_title_from_url(url),
            duration=probe.duration,
            fmt=probe.format,
        )
        await self._db.commit()
        return _to_response(entity)

    async def get_stream_file(self, session_id: str, bgm_id: str) -> tuple[Path, str]:
        entity = await self._repo.get_by_id(session_id, bgm_id)
        if entity is None or entity.status != "available":
            raise BgmNotFoundError("BGM 资源不存在")
        path = Path(entity.file_path)
        if not path.is_file():
            raise BgmNotFoundError("BGM 资源不存在")
        mime = {
            "mp3": "audio/mpeg",
            "m4a": "audio/mp4",
            "wav": "audio/wav",
        }.get(entity.format.lower(), "audio/mpeg")
        return path, mime

    async def _download_audio_to_storage(
        self,
        session_id: str,
        *,
        source_type: str,
        source_url: str,
        title: str,
        audio_url: str,
        fallback_duration: int = 0,
    ) -> BgmSourceResponse:
        try:
            async with httpx.AsyncClient(
                trust_env=False,
                timeout=60.0,
                follow_redirects=True,
                headers={
                    "User-Agent": (
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    ),
                },
            ) as client:
                response = await client.get(audio_url)
        except httpx.HTTPError as exc:
            logger.warning("BGM audio download failed", audio_url=audio_url, detail=str(exc))
            raise BgmUrlUnavailableError("BGM 链接不可用，请重新上传或更换链接") from exc

        if response.status_code >= 400 or not response.content:
            raise BgmUrlUnavailableError("BGM 链接不可用，请重新上传或更换链接")

        content_type = response.headers.get("content-type")
        ext = _guess_extension_from_media_url(audio_url, content_type)
        max_bytes = self._settings.max_bgm_file_size_mb * 1024 * 1024
        if len(response.content) > max_bytes:
            raise BgmTooLargeError("BGM 文件过大，最大支持 50MB")

        bgm_id = str(uuid.uuid4())
        dest = _bgm_dir(self._settings) / f"{bgm_id}{ext}"
        dest.write_bytes(response.content)

        try:
            probe = await probe_audio_file(self._settings.ffprobe_path, dest)
        except FfprobeUnavailableError:
            dest.unlink(missing_ok=True)
            raise
        except ValueError as exc:
            dest.unlink(missing_ok=True)
            logger.warning("BGM download probe failed", source_url=source_url, detail=str(exc))
            raise BgmUrlUnavailableError("BGM 链接不可用，请重新上传或更换链接") from exc

        duration = probe.duration or fallback_duration
        entity = await self._repo.create(
            session_id=session_id,
            source_type=source_type,
            source_url=source_url,
            file_path=str(dest),
            title=title,
            duration=duration,
            fmt=probe.format,
        )
        await self._db.commit()
        return _to_response(entity)

    async def validate_qishui_share(
        self,
        session_id: str,
        share_url: str,
    ) -> BgmSourceResponse:
        from src.services.qishui_parser_service import QishuiParserService

        parsed = await QishuiParserService().parse(share_url)
        return await self._download_audio_to_storage(
            session_id,
            source_type="qishui_share",
            source_url=parsed.share_url,
            title=parsed.title,
            audio_url=parsed.audio_url,
            fallback_duration=parsed.duration,
        )
