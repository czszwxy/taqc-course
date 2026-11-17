from solution import pair_with_sum


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


def test_finds_the_pair():
    assert pair_with_sum([200, 450, 600, 850, 1100], 1050) == (200, 850)


def test_exact_outer_pair():
    assert pair_with_sum([200, 450, 600, 850, 1100], 1300) == (200, 1100)


def test_smallest_lower_price_wins():
    """Кілька пар — повертай ту, де менша ціна найменша: 100 + 900, а не 400 + 600."""
    assert pair_with_sum([100, 400, 600, 900], 1000) == (100, 900)


def test_one_item_cannot_be_used_twice():
    """while left < right — два різні товари."""
    assert pair_with_sum([300, 400, 500], 1000) is None


def test_two_items_with_the_same_price():
    assert pair_with_sum([250, 500, 500], 1000) == (500, 500)


def test_no_pair():
    assert pair_with_sum([100, 200], 1000) is None
    assert pair_with_sum([], 100) is None
    assert pair_with_sum([100], 100) is None


def test_linear_number_of_reads():
    """Два вказівники читають кожну ціну щонайбільше раз за крок: не більше 2n читань."""
    prices = CountingList(range(0, 4000, 2))
    assert pair_with_sum(prices, 3001) is None
    assert prices.reads <= 2 * len(prices) + 2, f"{prices.reads} reads for {len(prices)} prices — not O(n)"
