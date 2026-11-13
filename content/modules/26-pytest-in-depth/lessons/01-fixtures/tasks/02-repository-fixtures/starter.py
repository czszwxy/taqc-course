import pytest

from subject import User, UserRepository


def test_empty_repository_has_no_users():
    assert len(UserRepository([])) == 0


# твій код тут
