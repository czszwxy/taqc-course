import pytest

from subject import password_strength


@pytest.mark.parametrize("password, expected", [
    ("abc", "weak"),
    ("Abcdef1", "weak"),
    ("abcdefgh", "medium"),
    ("Abcdefghij1", "medium"),
    ("Abcdefghijk1", "strong"),
    ("Abcdefghijkl", "medium"),
    ("abcdefghijk1", "medium"),
])
def test_password_strength(password, expected):
    assert password_strength(password) == expected
