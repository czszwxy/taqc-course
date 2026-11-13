import pytest

from subject import parse_price


def test_plain_number():
    assert parse_price("450") == 450


# твій код тут
