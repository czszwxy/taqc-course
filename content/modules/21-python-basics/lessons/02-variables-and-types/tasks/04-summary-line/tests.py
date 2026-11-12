from solution import summary_line


def test_two_items():
    """Числа перетвори через str() перед склеюванням з рядком."""
    assert summary_line("Mouse", 2, 450) == "Mouse x2 = 900 UAH"


def test_total_is_multiplied():
    """Сума — qty * price."""
    assert summary_line("Monitor", 3, 7500) == "Monitor x3 = 22500 UAH"


def test_single_item():
    assert summary_line("Cable", 1, 150) == "Cable x1 = 150 UAH"
