from dataclasses import dataclass, field

from solution import merge_sorted


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


@dataclass(order=True)
class Offer:
    price: int
    shop: str = field(compare=False)


def test_example():
    assert merge_sorted([100, 300, 900], [200, 300, 1200, 1500]) == [100, 200, 300, 300, 900, 1200, 1500]


def test_one_list_empty():
    assert merge_sorted([], [1, 2]) == [1, 2]
    assert merge_sorted([1, 2], []) == [1, 2]
    assert merge_sorted([], []) == []


def test_all_of_one_list_first():
    """Залишок другого списку дописується після циклу."""
    assert merge_sorted([1, 2], [5, 6, 7]) == [1, 2, 5, 6, 7]


def test_merge_is_stable():
    """Рівні ціни: спершу з first — беріть з second лише при строгому second[j] < first[i]."""
    first = [Offer(300, "first-a"), Offer(500, "first-b")]
    second = [Offer(300, "second-a"), Offer(500, "second-b")]
    assert [offer.shop for offer in merge_sorted(first, second)] == ["first-a", "second-a", "first-b", "second-b"]


def test_inputs_are_not_changed():
    first, second = [1, 3], [2, 4]
    merge_sorted(first, second)
    assert (first, second) == ([1, 3], [2, 4])


class Price:
    """A number that counts how many times it was compared (<, <=, >, >=, ==)."""

    comparisons = 0

    def __init__(self, value):
        self.value = value

    def _compare(self, other):
        Price.comparisons += 1
        return self.value - other.value

    def __lt__(self, other):
        return self._compare(other) < 0

    def __le__(self, other):
        return self._compare(other) <= 0

    def __gt__(self, other):
        return self._compare(other) > 0

    def __ge__(self, other):
        return self._compare(other) >= 0

    def __eq__(self, other):
        return isinstance(other, Price) and self._compare(other) == 0

    def __hash__(self):
        return hash(self.value)


def test_linear_number_of_reads():
    first = CountingList(range(0, 4000, 2))
    second = CountingList(range(1, 4000, 2))
    assert merge_sorted(first, second) == list(range(4000))
    total = len(first) + len(second)
    reads = first.reads + second.reads
    assert reads <= 3 * total, f"{reads} reads for {total} items — not O(n + m)"


def test_linear_number_of_comparisons():
    """Злиття порівнює лише дві «голови» за крок — менше n + m порівнянь. Вставка в позицію робить сотні тисяч."""
    Price.comparisons = 0
    first = [Price(value) for value in range(0, 1200, 2)]
    second = [Price(value) for value in range(1, 1200, 2)]
    merged = merge_sorted(first, second)
    assert [price.value for price in merged] == list(range(1200))
    total = len(first) + len(second)
    assert Price.comparisons <= 2 * total, f"{Price.comparisons} comparisons for {total} items — not O(n + m)"
