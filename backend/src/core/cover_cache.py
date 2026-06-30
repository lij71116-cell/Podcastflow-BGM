"""播客封面下载与本地缓存。"""

from pathlib import Path

import httpx
from pycore.core.logger import get_logger

logger = get_logger()

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

_CONTENT_TYPE_EXT = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def covers_dir(storage_root: str) -> Path:
    path = Path(storage_root) / "covers"
    path.mkdir(parents=True, exist_ok=True)
    return path


def resolve_cover_file(storage_root: str, podcast_id: str) -> Path | None:
    directory = covers_dir(storage_root)
    matches = sorted(directory.glob(f"{podcast_id}.*"))
    return matches[0] if matches else None


def cover_api_path(podcast_id: str) -> str:
    return f"/api/podcasts/{podcast_id}/cover"


def bgm_cover_api_path(bgm_id: str) -> str:
    return f"/api/bgm/{bgm_id}/cover"


async def download_podcast_cover(
    storage_root: str,
    podcast_id: str,
    remote_url: str,
    *,
    referer: str = "https://www.xiaoyuzhoufm.com/",
) -> Path | None:
    """下载远程封面到 storage/covers/{podcast_id}.{ext}。"""
    url = remote_url.strip()
    if not url.startswith("http"):
        return None

    try:
        async with httpx.AsyncClient(
            trust_env=False,
            timeout=20.0,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT, "Referer": referer},
        ) as client:
            response = await client.get(url)
    except httpx.HTTPError as exc:
        logger.warning(
            "Podcast cover download failed",
            podcast_id=podcast_id,
            detail=str(exc),
        )
        return None

    if response.status_code >= 400 or not response.content:
        logger.warning(
            "Podcast cover download bad status",
            podcast_id=podcast_id,
            status_code=response.status_code,
        )
        return None

    content_type = response.headers.get("content-type", "").split(";")[0].strip().lower()
    ext = _CONTENT_TYPE_EXT.get(content_type)
    if not ext:
        lowered = url.lower()
        for candidate in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
            if candidate in lowered:
                ext = ".jpg" if candidate == ".jpeg" else candidate
                break
        ext = ext or ".jpg"

    dest = covers_dir(storage_root) / f"{podcast_id}{ext}"
    for old in covers_dir(storage_root).glob(f"{podcast_id}.*"):
        if old != dest and old.is_file():
            old.unlink()
    dest.write_bytes(response.content)
    return dest
