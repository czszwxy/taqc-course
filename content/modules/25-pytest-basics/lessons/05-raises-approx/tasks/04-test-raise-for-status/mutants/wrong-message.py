class ApiError(Exception):
    def __init__(self, status: int, url: str):
        super().__init__(f"{url} returned {status}")
        self.status = status
        self.url = url


class AuthError(ApiError):
    pass


class NotFoundError(ApiError):
    pass


def raise_for_status(status: int, url: str) -> None:
    if status < 400:
        return
    if status in (401, 403):
        raise AuthError(status, url)
    if status == 404:
        raise NotFoundError(status, url)
    raise ApiError(status, url)
