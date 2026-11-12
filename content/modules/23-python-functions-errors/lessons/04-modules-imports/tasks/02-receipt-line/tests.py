from solution import receipt_line


def test_small_amount():
    assert receipt_line("Mouse", 450, 2) == "Mouse x2 = 900 UAH"


def test_thousands():
    """Формат з пробілом між тисячами вже вміє format_uah з money.py."""
    assert receipt_line("Monitor", 7500, 2) == "Monitor x2 = 15 000 UAH"


def test_multiplies_qty():
    """Сума — price * qty."""
    assert receipt_line("Cable", 150, 3) == "Cable x3 = 450 UAH"
