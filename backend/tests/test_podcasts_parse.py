"""POST /api/podcasts/parse 测试。"""

import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from src.services.podcast_exceptions import PodcastParseError

SAMPLE_HTML = """
<html><head>
<meta property="og:title" content="自我进化论｜No.78：情关过后，人生尽是自由" />
<meta property="og:image" content="https://image.xyzcdn.net/cover.jpg" />
<meta property="og:audio" content="https://media.xyzcdn.net/test.m4a" />
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "PodcastEpisode",
  "name": "自我进化论｜No.78：情关过后，人生尽是自由",
  "timeRequired": "PT53M",
  "description": "探讨情感关系中的成长与自我解放。",
  "associatedMedia": {
    "@type": "MediaObject",
    "contentUrl": "https://media.xyzcdn.net/test.m4a"
  },
  "partOfSeries": {
    "@type": "PodcastSeries",
    "name": "自我进化论"
  }
}
</script>
</head><body></body></html>
"""

SOURCE_URL = "https://www.xiaoyuzhoufm.com/episode/696f522e109824f9e18a114e"


class TestParsePodcastApi:
    def test_invalid_url_format(self, client: TestClient) -> None:
        response = client.post("/api/podcasts/parse", json={"source_url": "https://example.com"})
        assert response.status_code == 400
        body = response.json()
        assert body["code"] == 40001
        assert "链接格式无效" in body["message"]

    def test_parse_success(self, client: TestClient) -> None:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.text = SAMPLE_HTML

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch(
            "src.services.xiaoyuzhou_parser_service.httpx.AsyncClient",
            return_value=mock_client,
        ):
            response = client.post("/api/podcasts/parse", json={"source_url": SOURCE_URL})

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        data = body["data"]
        assert data["source_type"] == "xiaoyuzhou_episode"
        assert data["episode_id"] == "696f522e109824f9e18a114e"
        assert data["title"].startswith("自我进化论")
        assert data["podcast_name"] == "自我进化论"
        assert data["duration"] == 3180
        assert data["cover_url"] == "https://image.xyzcdn.net/cover.jpg"
        assert "audio_source_url" not in data
        assert "audio" not in json.dumps(data)

    def test_parse_failure_when_page_empty(self, client: TestClient) -> None:
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.text = "<html></html>"

        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with patch(
            "src.services.xiaoyuzhou_parser_service.httpx.AsyncClient",
            return_value=mock_client,
        ):
            response = client.post("/api/podcasts/parse", json={"source_url": SOURCE_URL})

        assert response.status_code == 400
        body = response.json()
        assert body["code"] == 40002
        assert "播客解析失败" in body["message"]

    def test_httpx_uses_trust_env_false(self) -> None:
        import asyncio

        from src.services.xiaoyuzhou_parser_service import XiaoyuzhouParserService

        mock_response = AsyncMock(status_code=404, text="")
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch(
            "src.services.xiaoyuzhou_parser_service.httpx.AsyncClient",
        ) as mock_cls:
            mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
            mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)
            parser = XiaoyuzhouParserService()

            with pytest.raises(PodcastParseError):
                asyncio.run(parser.parse(SOURCE_URL))

            _, kwargs = mock_cls.call_args
            assert kwargs.get("trust_env") is False
