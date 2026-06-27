"""汽水音乐分享链接解析与 BGM 校验测试。"""

import json
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from src.core.ffprobe import AudioProbeResult
from src.services.qishui_parser_service import (
    QishuiParserService,
    _parse_track_page,
    _parse_ugc_video_page,
)

SAMPLE_ROUTER_HTML = """
<script>_ROUTER_DATA = {"loaderData":{"track_page":{"track_id":"123","audioWithLyricsOption":{
"trackName":"矛盾","artistName":"z²","duration":157.546,
"group_playable_level":"free","url":"https://example.com/audio.m4a?mime_type=audio_mp4","encrypt":false
}}}};</script>
"""

SAMPLE_UGC_ROUTER_HTML = """
<script>_ROUTER_DATA = {"loaderData":{"ugc_video_page":{"video_id":"7546255807622761754","videoOptions":{
"videoName":"#dou上热门","artistName":"16","duration":75.5,
"group_playable_level":"pay","url":"https://example.com/video.mp4?mime_type=video_mp4"
}}}};</script>
"""

SHARE_URL = "https://qishui.douyin.com/s/imfkVHXh/"
UGC_SHARE_URL = "https://qishui.douyin.com/s/iQEuvExx/"


class TestQishuiParser:
    def test_parse_track_page_success(self) -> None:
        parsed = _parse_track_page(SAMPLE_ROUTER_HTML, SHARE_URL, "123")
        assert parsed.track_id == "123"
        assert parsed.title == "矛盾 - z²"
        assert parsed.audio_url.startswith("https://example.com/audio.m4a")
        assert parsed.duration == 157

    def test_parse_paid_track_rejected(self) -> None:
        paid_html = SAMPLE_ROUTER_HTML.replace('"free"', '"pay"')
        import pytest
        from src.services.bgm_exceptions import QishuiPaidTrackError

        with pytest.raises(QishuiPaidTrackError):
            _parse_track_page(paid_html, SHARE_URL, "123")

    def test_parse_ugc_video_page_success(self) -> None:
        parsed = _parse_ugc_video_page(SAMPLE_UGC_ROUTER_HTML, UGC_SHARE_URL, "7546255807622761754")
        assert parsed.track_id == "7546255807622761754"
        assert parsed.title == "#dou上热门 - 16"
        assert parsed.audio_url.startswith("https://example.com/video.mp4")
        assert parsed.duration == 75

    def test_parse_ugc_video_page_missing_url(self) -> None:
        import pytest
        from src.services.bgm_exceptions import QishuiParseError

        empty_html = SAMPLE_UGC_ROUTER_HTML.replace(
            '"url":"https://example.com/video.mp4?mime_type=video_mp4"', '"url":""'
        )
        with pytest.raises(QishuiParseError):
            _parse_ugc_video_page(empty_html, UGC_SHARE_URL, "7546255807622761754")


class TestValidateQishuiApi:
    def test_invalid_url(self, client: TestClient) -> None:
        client.get("/api/session")
        response = client.post(
            "/api/bgm/validate-qishui",
            json={"share_url": "https://example.com/not-qishui"},
        )
        assert response.status_code == 400
        assert response.json()["code"] == 40007

    def test_validate_success(self, client: TestClient, test_settings) -> None:
        from src.services.qishui_parser_service import ParsedQishuiTrack

        parsed = ParsedQishuiTrack(
            track_id="123",
            share_url=SHARE_URL,
            title="矛盾 - z²",
            audio_url="https://example.com/audio.m4a?mime_type=audio_mp4",
            duration=157,
        )
        mock_audio = AsyncMock(status_code=200, content=b"fake-audio", headers={"content-type": "audio/mp4"})
        mock_client = AsyncMock()
        mock_client.get = AsyncMock(return_value=mock_audio)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)

        with (
            patch.object(QishuiParserService, "parse", AsyncMock(return_value=parsed)),
            patch("src.services.bgm_service.httpx.AsyncClient", return_value=mock_client),
            patch("src.services.bgm_service.probe_audio_file", AsyncMock(return_value=AudioProbeResult(duration=157, format="m4a"))),
        ):
            client.get("/api/session")
            response = client.post("/api/bgm/validate-qishui", json={"share_url": SHARE_URL})

        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        data = body["data"]
        assert data["source_type"] == "qishui_share"
        assert data["title"] == "矛盾 - z²"
        assert data["status"] == "available"
        assert "output_file_path" not in json.dumps(data)
