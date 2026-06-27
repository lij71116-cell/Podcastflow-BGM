"""播客音频上游代理流式响应。"""

from collections.abc import AsyncIterator

import httpx
from fastapi import HTTPException

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


async def iter_podcast_upstream(
    audio_url: str,
    *,
    range_header: str | None = None,
    referer: str | None = None,
) -> tuple[int, dict[str, str], AsyncIterator[bytes]]:
    """拉取上游播客音频并返回 (status_code, headers, body_iterator)。"""
    headers: dict[str, str] = {"User-Agent": USER_AGENT}
    if range_header:
        headers["Range"] = range_header
    if referer:
        headers["Referer"] = referer

    client = httpx.AsyncClient(
        trust_env=False,
        timeout=httpx.Timeout(60.0, connect=15.0),
        follow_redirects=True,
    )
    try:
        request = client.build_request("GET", audio_url, headers=headers)
        upstream = await client.send(request, stream=True)
    except httpx.HTTPError as exc:
        await client.aclose()
        raise HTTPException(status_code=502, detail="播客音频源不可用") from exc

    if upstream.status_code >= 400:
        await upstream.aclose()
        await client.aclose()
        raise HTTPException(status_code=502, detail="播客音频源不可用")

    response_headers: dict[str, str] = {
        "Content-Disposition": "inline",
        "Accept-Ranges": "bytes",
    }
    for key in ("content-type", "content-length", "content-range"):
        if key in upstream.headers:
            response_headers[key] = upstream.headers[key]

    async def body() -> AsyncIterator[bytes]:
        try:
            async for chunk in upstream.aiter_bytes():
                yield chunk
        finally:
            await upstream.aclose()
            await client.aclose()

    return upstream.status_code, response_headers, body()
