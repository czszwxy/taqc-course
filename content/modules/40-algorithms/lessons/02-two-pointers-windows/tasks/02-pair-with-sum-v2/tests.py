from solution import best_pair_within


class CountingList(list):
    """A list that counts element reads: by index, slice, iteration, `in`, index() and count()."""

    def __init__(self, items=()):
        super().__init__(items)
        self.reads = 0

    def __getitem__(self, index):
        result = super().__getitem__(index)
        if isinstance(index, slice):
            self.reads += len(result)
            return list(result)
        self.reads += 1
        return result

    def __iter__(self):
        for item in super().__iter__():
            self.reads += 1
            yield item

    def __contains__(self, item):
        self.reads += len(self)
        return super().__contains__(item)

    def index(self, *args):
        self.reads += len(self)
        return super().index(*args)

    def count(self, item):
        self.reads += len(self)
        return super().count(item)


PRICES = [300, 500, 800, 1200, 1500]


def test_exact_budget_with_a_tie():
    """Дві пари на 2000: (500, 1500) і (800, 1200) — лишається та, де менша ціна найменша."""
    assert best_pair_within(PRICES, 2000) == (500, 1500)


def test_below_budget():
    assert best_pair_within(PRICES, 1000) == (300, 500)


def test_budget_between_sums():
    """Найбільша сума, що не перевищує 1900: 300 + 1500 = 1800."""
    assert best_pair_within(PRICES, 1900) == (300, 1500)


def test_nothing_fits():
    assert best_pair_within([300, 500, 800], 700) is None
    assert best_pair_within([500], 1000) is None
    assert best_pair_within([], 1000) is None


def test_linear_number_of_reads():
    """Не більше 2n читань — кожен крок відкидає одну ціну."""
    prices = CountingList(range(1, 4001))
    assert best_pair_within(prices, 5000) == (1000, 4000)
    assert prices.reads <= 2 * len(prices) + 2, f"{prices.reads} reads for {len(prices)} prices — not O(n)"
