from solution import best_growth


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
    assert best_growth([700, 100, 500, 300, 600, 400]) == 500


def test_only_falling():
    assert best_growth([700, 600, 400]) == 0


def test_short_inputs():
    assert best_growth([]) == 0
    assert best_growth([5]) == 0


def test_new_low_after_the_best_pair():
    """Новий мінімум після найкращої пари не повинен «з'їсти» вже знайдений приріст."""
    assert best_growth([2, 9, 1, 3]) == 7


def test_order_of_days_matters():
    """Сортування дало б 8, але день з 1 — останній."""
    assert best_growth([9, 3, 5, 1]) == 2


def test_linear_number_of_reads():
    visits = CountingList((n * 7919) % 1000 for n in range(1500))
    best_growth(visits)
    assert visits.reads <= 2 * len(visits), f"{visits.reads} reads for {len(visits)} days — not O(n)"
