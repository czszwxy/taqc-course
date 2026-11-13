from dataclasses import dataclass

ROLES = ("customer", "admin")


class InvalidUserError(Exception):
    """A user record from test data is broken."""


class User:
    # твій код тут
    pass


def user_from_dict(data: dict) -> User:
    # твій код тут
    pass
