from solution import common_items


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


def test_order_of_subscribers_without_repeats():
    assert common_items(["anna", "ivan", "olha"], ["petro", "olha", "anna", "olha"]) == ["olha", "anna"]


def test_nothing_in_common():
    assert common_items(["a"], ["b", "c"]) == []


def test_empty_lists():
    assert common_items([], ["a"]) == []
    assert common_items(["a"], []) == []


def test_linear_number_of_comparisons():
    """set(customers) один раз — і кожна перевірка O(1). Цикл у циклі робить мільйон порівнянь."""
    Token.comparisons = 0
    customers = [Token(n) for n in range(1000)]
    subscribers = [Token(n) for n in range(990, 1990)]
    result = common_items(customers, subscribers)
    assert [token.value for token in result] == list(range(990, 1000))
    total = len(customers) + len(subscribers)
    assert Token.comparisons <= total, f"{Token.comparisons} comparisons — the solution is not O(n + m)"
