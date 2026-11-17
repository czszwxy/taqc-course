import pytest

from solution import binary_search


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


IDS = [3, 8, 15, 23, 42, 57, 61, 90]


@pytest.mark.parametrize("target, expected", [(3, 0), (42, 4), (90, 7), (23, 3)])
def test_found(target, expected):
    """Перший і останній елементи теж: умова циклу low <= high."""
    assert binary_search(IDS, target) == expected


@pytest.mark.parametrize("target", [1, 10, 100])
def test_not_found(target):
    assert binary_search(IDS, target) == -1


def test_empty_and_single():
    assert binary_search([], 5) == -1
    assert binary_search([5], 5) == 0
    assert binary_search([5], 4) == -1


def test_logarithmic_number_of_reads():
    """Кожен крок ділить діапазон навпіл: на 100 000 id — до 17 читань. Лінійний пошук читає тисячі."""
    ids = CountingList(range(0, 200_000, 2))
    assert binary_search(ids, 123_456) == 61_728
    assert ids.reads <= 20, f"{ids.reads} reads for {len(ids)} ids — not O(log n)"


def test_missing_value_is_also_fast():
    ids = CountingList(range(0, 200_000, 2))
    assert binary_search(ids, 123_457) == -1
    assert ids.reads <= 20, f"{ids.reads} reads — not O(log n)"
