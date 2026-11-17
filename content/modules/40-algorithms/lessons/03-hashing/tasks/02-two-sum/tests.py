from solution import two_sum


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


def test_example():
    assert two_sum([1200, 300, 500, 900], 1400) == (2, 3)


def test_two_items_with_the_same_price():
    assert two_sum([700, 700], 1400) == (0, 1)


def test_one_item_cannot_pair_with_itself():
    """Спершу перевір budget - price у словнику, потім додай поточну ціну."""
    assert two_sum([700], 1400) is None
    assert two_sum([700, 100], 1400) is None


def test_smallest_j_then_smallest_i():
    """Перша пара при читанні зліва направо: j = 3; для нього i — перша поява 300 (позиція 0)."""
    assert two_sum([300, 300, 900, 1100], 1400) == (0, 3)


def test_no_pair():
    assert two_sum([], 10) is None
    assert two_sum([1, 2, 3], 100) is None


def test_linear_number_of_reads():
    """Словник замість внутрішнього циклу: не більше 2n читань."""
    prices = CountingList(range(1, 1501))
    assert two_sum(prices, 2999) == (1498, 1499)
    assert prices.reads <= 2 * len(prices), f"{prices.reads} reads for {len(prices)} prices — not O(n)"
