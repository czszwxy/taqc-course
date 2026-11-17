import pytest

from solution import bulk_requests


def test_last_batch_can_be_smaller():
    """Порції по size, остання — скільки лишилось."""
    assert bulk_requests([101, 102, 103, 104, 105], 2) == [
        {"ids": [101, 102]},
        {"ids": [103, 104]},
        {"ids": [105]},
    ]


def test_exact_multiple():
    assert bulk_requests([1, 2, 3, 4], 2) == [{"ids": [1, 2]}, {"ids": [3, 4]}]


def test_size_larger_than_input():
    assert bulk_requests([7, 8], 500) == [{"ids": [7, 8]}]


def test_empty_input():
    """Порожній iterable — порожній список запитів."""
    assert bulk_requests([], 3) == []


def test_works_with_a_generator():
    """У генератора немає len і зрізів — бери елементи по черзі (itertools.batched)."""
    ids = (n for n in range(1, 6))
    assert bulk_requests(ids, 3) == [{"ids": [1, 2, 3]}, {"ids": [4, 5]}]


def test_ids_are_lists_not_tuples():
    """batched повертає кортежі — перетвори кожну порцію на list(batch)."""
    result = bulk_requests([1, 2, 3], 2)
    assert all(type(request["ids"]) is list for request in result)


def test_size_below_one_is_rejected():
    """size < 1 → ValueError(\"size must be at least 1\")."""
    with pytest.raises(ValueError, match="size must be at least 1"):
        bulk_requests([1, 2], 0)
