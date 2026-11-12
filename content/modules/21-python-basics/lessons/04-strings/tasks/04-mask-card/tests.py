from solution import mask_card


def test_plain_number():
    """Залиш лише останні 4 цифри: зріз [-4:]."""
    assert mask_card("4111111111111234") == "**** **** **** 1234"


def test_number_with_spaces():
    """Спершу прибери пробіли: replace(\" \", \"\")."""
    assert mask_card("4111 1111 1111 5678") == "**** **** **** 5678"


def test_does_not_leak_digits():
    """Жодних інших цифр номера в результаті."""
    assert "4111" not in mask_card("4111111111110000")
