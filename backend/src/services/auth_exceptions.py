"""Auth 业务异常。"""


class AuthError(Exception):
    def __init__(self, code: int, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


class UsernameExistsError(AuthError):
    def __init__(self) -> None:
        super().__init__(40010, "用户名已存在")


class EmailExistsError(AuthError):
    def __init__(self) -> None:
        super().__init__(40011, "邮箱已存在")


class PasswordMismatchError(AuthError):
    def __init__(self) -> None:
        super().__init__(40012, "两次输入的密码不一致")


class InvalidCredentialsError(AuthError):
    def __init__(self) -> None:
        super().__init__(40102, "用户名或密码错误")


class UserNotFoundError(AuthError):
    def __init__(self) -> None:
        super().__init__(40101, "未登录或登录已失效")


class InvalidCurrentPasswordError(AuthError):
    def __init__(self) -> None:
        super().__init__(40102, "当前密码错误")


class AuthConfigError(AuthError):
    def __init__(self) -> None:
        super().__init__(50001, "服务未配置 JWT_SECRET，请在 Railway Variables 中设置后重新部署")
