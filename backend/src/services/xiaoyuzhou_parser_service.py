"""小宇宙公开单集页面解析。"""

import json
import re
from dataclasses import dataclass
from html import unescape

import httpx
from pycore.core.logger import get_logger
from src.services.podcast_exceptions import PodcastParseError, PodcastUrlInvalidError

logger = get_logger()

EPISODE_URL_PATTERN = re.compile(
    r"^https?://(?:www\.)?xiaoyuzhoufm\.com/episode/([a-zA-Z0-9]+)/?(?:\?.*)?$",
    re.IGNORECASE,
)
JSON_LD_PATTERN = re.compile(
    r'<script[^>]+type="application/ld\+json"[^>]*>(?P<body>.*?)</script>',
    re.DOTALL | re.IGNORECASE,
)
OG_META_PATTERN = re.compile(
    r'<meta\s+property="(?P<prop>og:[^"]+)"\s+content="(?P<content>[^"]*)"',
    re.IGNORECASE,
)
ISO8601_DURATION_PATTERN = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", re.IGNORECASE)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


@dataclass(frozen=True)
class ParsedEpisode:
    episode_id: str
    source_url: str
    title: str
    podcast_name: str
    cover_url: str
    duration: int
    description: str
    audio_source_url: str


def extract_episode_id(source_url: str) -> str:
    match = EPISODE_URL_PATTERN.match(source_url.strip())
    if not match:
        raise PodcastUrlInvalidError(
            "链接格式无效，请输入小宇宙公开单集链接（xiaoyuzhoufm.com/episode/{id}）"
        )
    return match.group(1)


def _parse_iso8601_duration(value: str) -> int:
    match = ISO8601_DURATION_PATTERN.fullmatch(value.strip())
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


def _parse_json_ld(html: str) -> dict | None:
    for match in JSON_LD_PATTERN.finditer(html):
        raw = unescape(match.group("body")).strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and data.get("@type") == "PodcastEpisode":
            return data
    return None


def _parse_og_meta(html: str) -> dict[str, str]:
    return {
        m.group("prop").lower(): unescape(m.group("content"))
        for m in OG_META_PATTERN.finditer(html)
    }


def _build_parsed_episode(source_url: str, episode_id: str, html: str) -> ParsedEpisode:
    ld = _parse_json_ld(html)
    og = _parse_og_meta(html)

    if ld:
        title = str(ld.get("name") or og.get("og:title") or "").strip()
        description = str(ld.get("description") or "").strip()
        duration = _parse_iso8601_duration(str(ld.get("timeRequired") or ""))
        audio_source_url = ""
        media = ld.get("associatedMedia")
        if isinstance(media, dict):
            audio_source_url = str(media.get("contentUrl") or "").strip()
        series = ld.get("partOfSeries")
        podcast_name = ""
        if isinstance(series, dict):
            podcast_name = str(series.get("name") or "").strip()
    else:
        title = og.get("og:title", "").strip()
        description = ""
        duration = 0
        audio_source_url = og.get("og:audio", "").strip()
        podcast_name = ""

    cover_url = og.get("og:image", "").strip()

    if not title or not audio_source_url:
        raise PodcastParseError("播客解析失败，请检查链接是否为公开单集")

    if not podcast_name and "｜" in title:
        podcast_name = title.split("｜", 1)[0].strip()
    if not podcast_name:
        podcast_name = "小宇宙播客"

    return ParsedEpisode(
        episode_id=episode_id,
        source_url=source_url,
        title=title,
        podcast_name=podcast_name,
        cover_url=cover_url,
        duration=duration,
        description=description[:2000],
        audio_source_url=audio_source_url,
    )


class XiaoyuzhouParserService:
    """通过公开 episode 页面 JSON-LD / OpenGraph 元数据解析单集。"""

    def __init__(self, timeout_seconds: float = 20.0) -> None:
        self._timeout = timeout_seconds

    async def parse(self, source_url: str) -> ParsedEpisode:
        episode_id = extract_episode_id(source_url)
        page_url = f"https://www.xiaoyuzhoufm.com/episode/{episode_id}"

        try:
            async with httpx.AsyncClient(
                trust_env=False,
                timeout=self._timeout,
                follow_redirects=True,
                headers={
                    "User-Agent": USER_AGENT,
                    "Referer": "https://www.xiaoyuzhoufm.com/",
                },
            ) as client:
                response = await client.get(page_url)
        except httpx.HTTPError as exc:
            logger.warning("Xiaoyuzhou fetch failed", episode_id=episode_id, detail=str(exc))
            raise PodcastParseError("播客解析失败，请检查链接是否为公开单集") from exc

        if response.status_code >= 400:
            logger.warning(
                "Xiaoyuzhou fetch bad status",
                episode_id=episode_id,
                status_code=response.status_code,
            )
            raise PodcastParseError("播客解析失败，请检查链接是否为公开单集")

        try:
            return _build_parsed_episode(source_url.strip(), episode_id, response.text)
        except PodcastParseError:
            raise
        except Exception as exc:
            logger.warning("Xiaoyuzhou parse failed", episode_id=episode_id, detail=str(exc))
            raise PodcastParseError("播客解析失败，请检查链接是否为公开单集") from exc
