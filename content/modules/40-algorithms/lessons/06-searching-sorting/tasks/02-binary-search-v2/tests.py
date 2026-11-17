from solution import first_at_least


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


PRICES = [100, 200, 200, 350, 500]


def test_first_of_equal_prices():
    """При prices[middle] >= minimum — high = middle: лівіша з однакових лишається в діапазоні."""
    assert first_at_least(PRICES, 200) == 1


def test_between_prices():
    assert first_at_least(PRICES, 300) == 3


def test_below_all_and_above_all():
    assert first_at_least(PRICES, 50) == 0
    assert first_at_least(PRICES, 999) == 5


def test_empty():
    assert first_at_least([], 10) == 0


def test_logarithmic_number_of_reads():
    prices = CountingList(sorted([n // 3 for n in range(100_000)]))
    assert first_at_least(prices, 20_000) == 60_000
    assert prices.reads <= 20, f"{prices.reads} reads for {len(prices)} prices — not O(log n)"
