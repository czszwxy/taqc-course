class ApiError(Exception):
    # твій код тут
    pass


class AuthError(ApiError):
    pass


class NotFoundError(ApiError):
    pass


def raise_for_status(status: int, url: str) -> None:
    # твій код тут
    pass
