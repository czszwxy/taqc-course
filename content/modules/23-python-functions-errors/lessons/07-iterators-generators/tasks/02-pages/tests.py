import types

from solution import pages


def test_is_generator():
    """Функція має бути генератором: yield замість return списку."""
    assert isinstance(pages([1], 1), types.GeneratorType)


def test_last_page_shorter():
    assert list(pages([1, 2, 3, 4, 5], 2)) == [[1, 2], [3, 4], [5]]


def test_exact_pages():
    """Без порожньої сторінки в кінці: range(0, len(items), size)."""
    assert list(pages([1, 2, 3, 4], 2)) == [[1, 2], [3, 4]]


def test_size_bigger_than_list():
    assert list(pages([1, 2], 10)) == [[1, 2]]


def test_empty():
    assert list(pages([], 3)) == []
