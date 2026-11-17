from itertools import islice

from solution import Paginator


class FakeApi:
    def __init__(self, pages):
        self.pages = pages
        self.requested = []

    def fetch(self, page):
        self.requested.append(page)
        return self.pages.get(page, [])


def test_items_from_all_pages_in_order():
    """Віддавай товари всіх сторінок підряд: yield from items для кожної сторінки."""
    api = FakeApi({1: ["KB-01", "MS-02"], 2: ["HD-07"]})
    assert list(Paginator(api.fetch)) == ["KB-01", "MS-02", "HD-07"]


def test_stops_at_the_first_empty_page():
    """Порожня сторінка — кінець: далі не запитуй (сторінку 4 не можна чіпати)."""
    api = FakeApi({1: ["a"], 2: ["b"], 4: ["never"]})
    assert list(Paginator(api.fetch)) == ["a", "b"]
    assert api.requested == [1, 2, 3]


def test_pages_are_fetched_lazily():
    """Узяли 2 товари з першої сторінки — другу сторінку ще не запитано."""
    api = FakeApi({1: ["a", "b", "c"], 2: ["d"]})
    assert list(islice(Paginator(api.fetch), 2)) == ["a", "b"]
    assert api.requested == [1]


def test_can_be_iterated_twice():
    """__iter__-генератор: кожен for починає знову зі сторінки 1."""
    api = FakeApi({1: ["a"], 2: ["b"]})
    paginator = Paginator(api.fetch)
    assert list(paginator) == ["a", "b"]
    assert list(paginator) == ["a", "b"]


def test_no_items_at_all():
    api = FakeApi({})
    assert list(Paginator(api.fetch)) == []
    assert api.requested == [1]
