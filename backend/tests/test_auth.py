"""Auth API 测试（T-021）。"""

from fastapi.testclient import TestClient
from src.core.config import AppSettings


class TestAuthRegister:
    def test_register_success(self, client: TestClient, test_settings: AppSettings) -> None:
        response = client.post(
            "/api/auth/register",
            json={
                "username": "focus_listener",
                "email": "focus@example.com",
                "password": "password123",
                "password_confirm": "password123",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        assert body["data"]["user"]["username"] == "focus_listener"
        assert body["data"]["user"]["email"] == "focus@example.com"
        assert body["data"]["token"]
        assert test_settings.jwt_cookie_name in response.cookies

    def test_register_password_mismatch(self, client: TestClient) -> None:
        response = client.post(
            "/api/auth/register",
            json={
                "username": "user_a",
                "email": "a@example.com",
                "password": "password123",
                "password_confirm": "different",
            },
        )
        assert response.status_code == 400
        assert response.json()["code"] == 40012

    def test_register_duplicate_username(self, client: TestClient) -> None:
        payload = {
            "username": "dup_user",
            "email": "first@example.com",
            "password": "password123",
            "password_confirm": "password123",
        }
        assert client.post("/api/auth/register", json=payload).status_code == 200
        dup = client.post(
            "/api/auth/register",
            json={
                **payload,
                "email": "second@example.com",
            },
        )
        assert dup.status_code == 400
        assert dup.json()["code"] == 40010

    def test_register_duplicate_email(self, client: TestClient) -> None:
        payload = {
            "username": "user_one",
            "email": "shared@example.com",
            "password": "password123",
            "password_confirm": "password123",
        }
        assert client.post("/api/auth/register", json=payload).status_code == 200
        dup = client.post(
            "/api/auth/register",
            json={
                **payload,
                "username": "user_two",
            },
        )
        assert dup.status_code == 400
        assert dup.json()["code"] == 40011


class TestAuthLogin:
    def _register(self, client: TestClient) -> None:
        client.post(
            "/api/auth/register",
            json={
                "username": "login_user",
                "email": "login@example.com",
                "password": "password123",
                "password_confirm": "password123",
            },
        )

    def test_login_by_username(self, client: TestClient, test_settings: AppSettings) -> None:
        self._register(client)
        response = client.post(
            "/api/auth/login",
            json={
                "mode": "username",
                "username": "login_user",
                "password": "password123",
            },
        )
        assert response.status_code == 200
        assert response.json()["data"]["user"]["username"] == "login_user"
        assert test_settings.jwt_cookie_name in response.cookies

    def test_login_by_email(self, client: TestClient) -> None:
        self._register(client)
        response = client.post(
            "/api/auth/login",
            json={
                "mode": "email",
                "email": "login@example.com",
                "password": "password123",
            },
        )
        assert response.status_code == 200
        assert response.json()["data"]["user"]["email"] == "login@example.com"

    def test_login_wrong_password(self, client: TestClient) -> None:
        self._register(client)
        response = client.post(
            "/api/auth/login",
            json={
                "mode": "username",
                "username": "login_user",
                "password": "wrongpass",
            },
        )
        assert response.status_code == 401
        assert response.json()["code"] == 40102


class TestAuthMeAndLogout:
    def test_me_requires_login(self, client: TestClient) -> None:
        response = client.get("/api/auth/me")
        assert response.status_code == 401
        assert response.json()["code"] == 40101

    def test_me_after_register(self, client: TestClient, test_settings: AppSettings) -> None:
        register = client.post(
            "/api/auth/register",
            json={
                "username": "me_user",
                "email": "me@example.com",
                "password": "password123",
                "password_confirm": "password123",
            },
        )
        token = register.cookies[test_settings.jwt_cookie_name]
        me = client.get("/api/auth/me", cookies={test_settings.jwt_cookie_name: token})
        assert me.status_code == 200
        assert me.json()["data"]["username"] == "me_user"

    def test_logout_clears_session(self, client: TestClient) -> None:
        client.post(
            "/api/auth/register",
            json={
                "username": "logout_user",
                "email": "logout@example.com",
                "password": "password123",
                "password_confirm": "password123",
            },
        )
        assert client.get("/api/auth/me").status_code == 200

        logout = client.post("/api/auth/logout")
        assert logout.status_code == 200
        assert logout.json()["data"]["logged_out"] is True

        me = client.get("/api/auth/me")
        assert me.status_code == 401
        assert me.json()["code"] == 40101


class TestAuthChangePassword:
    def _register(self, client: TestClient) -> None:
        client.post(
            "/api/auth/register",
            json={
                "username": "changepw_user",
                "email": "changepw@example.com",
                "password": "password123",
                "password_confirm": "password123",
            },
        )

    def test_change_password_success(self, client: TestClient, test_settings: AppSettings) -> None:
        self._register(client)
        response = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "password123",
                "new_password": "newpassword456",
                "new_password_confirm": "newpassword456",
            },
        )
        assert response.status_code == 200
        body = response.json()
        assert body["code"] == 200
        assert body["data"]["password_changed"] is True
        assert test_settings.jwt_cookie_name in response.cookies

        old_login = client.post(
            "/api/auth/login",
            json={
                "mode": "username",
                "username": "changepw_user",
                "password": "password123",
            },
        )
        assert old_login.status_code == 401
        assert old_login.json()["code"] == 40102

        new_login = client.post(
            "/api/auth/login",
            json={
                "mode": "username",
                "username": "changepw_user",
                "password": "newpassword456",
            },
        )
        assert new_login.status_code == 200

    def test_change_password_wrong_current(self, client: TestClient) -> None:
        self._register(client)
        response = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "wrongpassword",
                "new_password": "newpassword456",
                "new_password_confirm": "newpassword456",
            },
        )
        assert response.status_code == 401
        assert response.json()["code"] == 40102
        assert "当前密码" in response.json()["message"]

    def test_change_password_confirm_mismatch(self, client: TestClient) -> None:
        self._register(client)
        response = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "password123",
                "new_password": "newpassword456",
                "new_password_confirm": "different456",
            },
        )
        assert response.status_code == 400
        assert response.json()["code"] == 40012

    def test_change_password_requires_login(self, client: TestClient) -> None:
        response = client.post(
            "/api/auth/change-password",
            json={
                "current_password": "password123",
                "new_password": "newpassword456",
                "new_password_confirm": "newpassword456",
            },
        )
        assert response.status_code == 401
        assert response.json()["code"] == 40101
