import pytest

from solution import busiest_window


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
    assert busiest_window([4, 2, 7, 1, 8, 3], 3) == (2, 16)


def test_earliest_window_wins_a_tie():
    """Оновлюй лише при строго більшій сумі."""
    assert busiest_window([5, 5], 1) == (0, 5)
    assert busiest_window([1, 3, 3, 1], 2) == (1, 6)


def test_window_of_all_hours():
    assert busiest_window([2, 4, 6], 3) == (0, 12)


def test_window_at_the_end():
    assert busiest_window([1, 1, 1, 9, 9], 2) == (3, 18)


@pytest.mark.parametrize("k", [0, -1, 4])
def test_invalid_k(k):
    with pytest.raises(ValueError, match="k must be between 1 and the number of hours"):
        busiest_window([1, 2, 3], k)


def test_linear_number_of_reads():
    """Зсувай вікно: + нова година, − стара. sum кожного вікна заново дає n · k читань."""
    hours = CountingList((n * 37) % 101 for n in range(3000))
    busiest_window(hours, 500)
    assert hours.reads <= 2 * len(hours), f"{hours.reads} reads for {len(hours)} hours — not O(n)"
