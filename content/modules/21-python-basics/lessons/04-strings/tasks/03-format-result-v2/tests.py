from solution import format_price


def test_thousands():
    """Пробіл між тисячами: f"{amount:,}" і заміна коми на пробіл."""
    assert format_price(5570) == "5 570 UAH"


def test_millions():
    assert format_price(1234567) == "1 234 567 UAH"


def test_small_numbers():
    """Менше 1000 — без розділювача."""
    assert format_price(999) == "999 UAH"
    assert format_price(0) == "0 UAH"
