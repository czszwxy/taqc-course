import pytest

from subject import parse_price


def test_plain_number():
    assert parse_price("450") == 450


def test_non_breaking_space_and_currency():
    assert parse_price("1\xa0200 грн") == 1200


def test_text_is_rejected_with_clear_message():
    with pytest.raises(ValueError, match="Invalid price: 'abc'"):
        parse_price("abc")


def test_negative_is_rejected():
    with pytest.raises(ValueError):
        parse_price("-5")


def test_empty_is_rejected():
    with pytest.raises(ValueError):
        parse_price("")
