"""汽水音乐分享链接解析。"""

import json
import re
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
from pycore.core.logger import get_logger
from src.services.bgm_exceptions import (
    QishuiPaidTrackError,
    QishuiParseError,
    QishuiUrlInvalidError,
)

logger = get_logger()

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

QISHUI_SHARE_PATTERN = re.compile(
    r"^https?://(?:www\.)?qishui\.douyin\.com/s/[a-zA-Z0-9]+/?(?:\?.*)?$",
    re.IGNORECASE,
)
QISHUI_TRACK_PATTERN = re.compile(
    r"^https?://(?:www\.)?music\.douyin\.com/qishui/share/track\b",
    re.IGNORECASE,
)
QISHUI_UGC_VIDEO_PATTERN = re.compile(
    r"^https?://(?:www\.)?music\.douyin\.com/qishui/share/ugc_video\b",
    re.IGNORECASE,
)
TRACK_ID_PATTERN = re.compile(r"track_id=(\d+)")
UGC_VIDEO_ID_PATTERN = re.compile(r"ugc_video_id=(\d+)")


@dataclass(frozen=True)
class ParsedQishuiTrack:
    track_id: str
    share_url: str
    title: str
    audio_url: str
    duration: int


def is_qishui_share_url(url: str) -> bool:
    value = url.strip()
    return bool(
        QISHUI_SHARE_PATTERN.match(value)
        or QISHUI_TRACK_PATTERN.match(value)
        or QISHUI_UGC_VIDEO_PATTERN.match(value)
    )


def _extract_share_target(resolved_url: str) -> tuple[str, str]:
    """从落地页 URL 识别分享类型与内容 ID。返回 (track|ugc_video, id)。"""
    parsed = urlparse(resolved_url)
    query = parse_qs(parsed.query)
    path = parsed.path.lower()

    if "/qishui/share/ugc_video" in path or "ugc_video_id" in query:
        video_ids = query.get("ugc_video_id")
        if video_ids and video_ids[0].isdigit():
            return "ugc_video", video_ids[0]
        match = UGC_VIDEO_ID_PATTERN.search(resolved_url)
        if match:
            return "ugc_video", match.group(1)

    track_ids = query.get("track_id")
    if track_ids and track_ids[0].isdigit():
        return "track", track_ids[0]
    match = TRACK_ID_PATTERN.search(resolved_url)
    if match:
        return "track", match.group(1)

    raise QishuiParseError("汽水音乐解析失败，请确认链接为公开分享")


def _extract_router_data(html: str) -> dict[str, Any]:
    marker = "_ROUTER_DATA"
    idx = html.find(marker)
    if idx == -1:
        raise QishuiParseError("汽水音乐解析失败，请确认链接为公开分享")

    start = html.find("{", idx)
    if start == -1:
        raise QishuiParseError("汽水音乐解析失败，请确认链接为公开分享")

    depth = 0
    for pos in range(start, len(html)):
        char = html[pos]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                try:
                    parsed: dict[str, Any] = json.loads(html[start : pos + 1])
                    return parsed
                except json.JSONDecodeError as exc:
                    raise QishuiParseError("汽水音乐解析失败，请确认链接为公开分享") from exc

    raise QishuiParseError("汽水音乐解析失败，请确认链接为公开分享")


def _parse_track_page(html: str, share_url: str, track_id: str) -> ParsedQishuiTrack:
    data = _extract_router_data(html)
    track_page = data.get("loaderData", {}).get("track_page", {})
    option = track_page.get("audioWithLyricsOption") or {}

    playable = (option.get("group_playable_level") or "").lower()
    if playable and playable != "free":
        raise QishuiPaidTrackError(
            "该曲目为付费内容，无法作为 BGM 使用，请换一首免费曲目或改用本地上传"
        )

    audio_url = (option.get("url") or "").strip()
    if not audio_url or option.get("encrypt"):
        raise QishuiPaidTrackError(
            "该曲目为付费内容，无法作为 BGM 使用，请换一首免费曲目或改用本地上传"
        )

    track_name = (option.get("trackName") or "").strip()
    artist_name = (option.get("artistName") or "").strip()
    if track_name and artist_name:
        title = f"{track_name} - {artist_name}"
    else:
        title = track_name or artist_name or "汽水音乐"

    duration_raw = option.get("duration")
    duration = int(float(duration_raw)) if duration_raw else 0

    return ParsedQishuiTrack(
        track_id=track_id,
        share_url=share_url,
        title=title,
        audio_url=audio_url,
        duration=duration,
    )


def _parse_ugc_video_page(html: str, share_url: str, video_id: str) -> ParsedQishuiTrack:
    data = _extract_router_data(html)
    ugc_page = data.get("loaderData", {}).get("ugc_video_page", {})
    option = ugc_page.get("videoOptions") or {}

    media_url = (option.get("url") or "").strip()
    if not media_url:
        raise QishuiParseError("汽水音乐解析失败，请确认链接为公开分享")

    video_name = (option.get("videoName") or "").strip()
    artist_name = (option.get("artistName") or "").strip()
    if video_name and artist_name:
        title = f"{video_name} - {artist_name}"
    else:
        title = video_name or artist_name or "汽水音乐"

    duration_raw = option.get("duration")
    duration = int(float(duration_raw)) if duration_raw else 0

    return ParsedQishuiTrack(
        track_id=video_id,
        share_url=share_url,
        title=title,
        audio_url=media_url,
        duration=duration,
    )


class QishuiParserService:
    async def parse(self, share_url: str) -> ParsedQishuiTrack:
        url = share_url.strip()
        if not is_qishui_share_url(url):
            raise QishuiUrlInvalidError(
                "链接格式无效，请输入汽水音乐分享链接（qishui.douyin.com/s/...）"
            )

        try:
            async with httpx.AsyncClient(
                trust_env=False,
                timeout=30.0,
                follow_redirects=True,
                headers={"User-Agent": USER_AGENT},
            ) as client:
                response = await client.get(url)
        except httpx.HTTPError as exc:
            logger.warning("Qishui share fetch failed", share_url=url, detail=str(exc))
            raise QishuiParseError("汽水音乐解析失败，请确认链接为公开分享") from exc

        if response.status_code >= 400:
            raise QishuiParseError("汽水音乐解析失败，请确认链接为公开分享")

        resolved = str(response.url)
        share_type, content_id = _extract_share_target(resolved)

        if share_type == "track":
            if "track_id=" not in resolved or "/qishui/share/track" not in resolved:
                page_url = f"https://music.douyin.com/qishui/share/track?track_id={content_id}"
            else:
                page_url = None
        else:
            if "ugc_video_id=" not in resolved or "/qishui/share/ugc_video" not in resolved:
                page_url = (
                    f"https://music.douyin.com/qishui/share/ugc_video?ugc_video_id={content_id}"
                )
            else:
                page_url = None

        if page_url:
            try:
                async with httpx.AsyncClient(
                    trust_env=False,
                    timeout=30.0,
                    follow_redirects=True,
                    headers={"User-Agent": USER_AGENT},
                ) as client:
                    page_resp = await client.get(page_url)
            except httpx.HTTPError as exc:
                logger.warning(
                    "Qishui share page fetch failed",
                    share_type=share_type,
                    content_id=content_id,
                    detail=str(exc),
                )
                raise QishuiParseError("汽水音乐解析失败，请确认链接为公开分享") from exc
            html = page_resp.text
        else:
            html = response.text

        if share_type == "track":
            return _parse_track_page(html, url, content_id)
        return _parse_ugc_video_page(html, url, content_id)
