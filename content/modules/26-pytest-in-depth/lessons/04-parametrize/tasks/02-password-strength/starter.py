import pytest

from subject import password_strength


@pytest.mark.parametrize("password, expected", [
    ("abc", "weak"),
    # твій код тут
])
def test_password_strength(password, expected):
    assert password_strength(password) == expected
