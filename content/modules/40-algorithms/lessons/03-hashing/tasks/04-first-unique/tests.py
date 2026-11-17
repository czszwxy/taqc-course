from solution import first_unique


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


def test_example():
    assert first_unique(["u7", "u3", "u7", "u9", "u3"]) == "u9"


def test_no_unique_values():
    assert first_unique(["u1", "u1"]) is None
    assert first_unique([]) is None


def test_first_in_list_order():
    """Перший зліва серед тих, що трапляються рівно один раз."""
    assert first_unique(["a", "b", "c", "a"]) == "b"


def test_linear_number_of_comparisons():
    """Counter + другий прохід. events.count(x) для кожного x дає мільйон порівнянь."""
    Token.comparisons = 0
    events = [Token(n % 500) for n in range(1000)] + [Token("unique")]
    result = first_unique(events)
    assert result.value == "unique"
    assert Token.comparisons <= 3 * len(events), f"{Token.comparisons} comparisons — the solution is not O(n)"
