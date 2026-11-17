from solution import first_repeated


class Token:
    """A value that counts how many times it was compared with ==."""

    comparisons = 0

    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        Token.comparisons += 1
        return isinstance(other, Token) and self.value == other.value

    def __hash__(self):
        return hash(self.value)


def test_first_second_occurrence_wins():
    """Відповідь — значення, чия ДРУГА поява найраніша, а не те, що з'явилося першим."""
    emails = ["anna@shop.ua", "ivan@shop.ua", "olha@shop.ua", "ivan@shop.ua", "anna@shop.ua"]
    assert first_repeated(emails) == "ivan@shop.ua"


def test_no_repeats():
    assert first_repeated([1, 2, 3]) is None


def test_empty():
    assert first_repeated([]) is None


def test_neighbours():
    assert first_repeated([7, 7]) == 7


def test_linear_number_of_comparisons():
    """Множина seen: перевірка in за O(1). Цикл у циклі або in для списку дає ~500 000 порівнянь замість ~1."""
    Token.comparisons = 0
    items = [Token(n) for n in range(1000)] + [Token(700)]
    result = first_repeated(items)
    assert result.value == 700
    assert Token.comparisons <= len(items), f"{Token.comparisons} comparisons for {len(items)} items — the solution is not O(n)"
