"""GET /health 验收测试。"""

from fastapi.testclient import TestClient


class TestHealth:
    def test_health_returns_200(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_status_ok(self, client: TestClient) -> None:
        body = client.get("/health").json()
        assert body["code"] == 200
        assert body["data"]["status"] == "ok"

    def test_health_ffmpeg_available_field(self, client: TestClient) -> None:
        body = client.get("/health").json()
        assert "ffmpeg_available" in body["data"]
        assert isinstance(body["data"]["ffmpeg_available"], bool)

    def test_health_ffmpeg_false_when_not_installed(self, client: TestClient) -> None:
        body = client.get("/health").json()
        assert body["data"]["ffmpeg_available"] is False

    def test_health_no_session_cookie(self, client: TestClient) -> None:
        response = client.get("/health")
        assert "podcast_flow_session" not in response.cookies
