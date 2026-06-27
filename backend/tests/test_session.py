"""Session 中间件测试。"""

import sqlite3

from fastapi.testclient import TestClient
from src.core.config import AppSettings


class TestSessionMiddleware:
    def test_api_sets_cookie_on_first_visit(self, client: TestClient) -> None:
        response = client.get("/api/session")
        assert response.status_code == 200
        assert "podcast_flow_session" in response.cookies
        cookie = response.cookies["podcast_flow_session"]
        assert len(cookie) == 36

    def test_api_returns_session_id(self, client: TestClient) -> None:
        response = client.get("/api/session")
        body = response.json()
        assert body["code"] == 200
        session_id = body["data"]["session_id"]
        assert len(session_id) == 36

    def test_subsequent_request_reuses_cookie(
        self, client: TestClient, test_settings: AppSettings
    ) -> None:
        first = client.get("/api/session")
        session_id = first.json()["data"]["session_id"]
        cookie = first.cookies["podcast_flow_session"]

        reused = client.get("/api/session", cookies={"podcast_flow_session": cookie})
        assert reused.json()["data"]["session_id"] == session_id

    def test_session_persisted_in_database(
        self, client: TestClient, test_settings: AppSettings
    ) -> None:
        response = client.get("/api/session")
        session_id = response.json()["data"]["session_id"]

        conn = sqlite3.connect(test_settings.database_path)
        try:
            row = conn.execute(
                "SELECT session_id FROM sessions WHERE session_id = ?",
                (session_id,),
            ).fetchone()
            assert row is not None
            assert row[0] == session_id
        finally:
            conn.close()

    def test_health_skips_session_middleware(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200
        assert "podcast_flow_session" not in response.cookies
