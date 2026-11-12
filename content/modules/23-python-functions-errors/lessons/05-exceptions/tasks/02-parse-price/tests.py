import pytest

from solution import parse_price


def test_plain_number():
    assert parse_price("450") == 450


def test_currency_and_spaces():
    """Прибери "грн" і пробіли: "1 200 грн" → 1200."""
    assert parse_price(" 1 200 грн ") == 1200


def test_non_breaking_space():
    """Нерозривний пробіл \\xa0: "".join(text.split()) прибирає і його."""
    assert parse_price("1\xa0200 грн") == 1200


def test_zero_is_valid():
    assert parse_price("0 грн") == 0


def test_text_rejected():
    """Підніми ValueError(f"Invalid price: '{text}'") з початковим текстом."""
    with pytest.raises(ValueError, match="Invalid price: 'abc'"):
        parse_price("abc")


def test_decimal_rejected():
    with pytest.raises(ValueError, match="Invalid price: '12,50 грн'"):
        parse_price("12,50 грн")


def test_negative_rejected():
    """Мінус — не ціна: isdigit() для "-5" повертає False."""
    with pytest.raises(ValueError, match="Invalid price"):
        parse_price("-5")


def test_empty_rejected():
    """Порожній рядок — теж помилка, а не 0."""
    with pytest.raises(ValueError, match="Invalid price: ''"):
        parse_price("")
