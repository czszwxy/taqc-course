import collections.abc
from typing import get_args, get_origin, get_type_hints

import pytest

from solution import first, index_by

USERS = [{"id": 7, "email": "anna@example.com"}, {"id": 9, "email": "ivan@example.com"}]


def test_first_returns_the_first_item():
    assert first(["KB-01", "MS-02"]) == "KB-01"


def test_first_of_an_empty_list_is_none():
    assert first([]) is None


def test_first_keeps_falsy_items():
    """Перевіряй, чи порожній список, а не чи «хибний» елемент: first([0]) == 0."""
    assert first([0, 5]) == 0
    assert first([""]) == ""


def test_index_by_id():
    assert index_by(USERS, lambda user: user["id"]) == {7: USERS[0], 9: USERS[1]}


def test_index_by_empty():
    assert index_by([], lambda item: item) == {}


def test_duplicate_key_is_an_error():
    """Ключ уже є — raise ValueError(f\"duplicate key: {item_key!r}\")."""
    with pytest.raises(ValueError, match="duplicate key: 'a'"):
        index_by(["a", "b", "a"], lambda value: value)


def test_first_is_generic():
    """def first[T](items: list[T]) -> T | None — саме з параметром типу T."""
    assert len(first.__type_params__) == 1
    (t,) = first.__type_params__
    hints = get_type_hints(first)
    assert hints["items"] == list[t]
    assert hints["return"] == (t | None)


def test_index_by_is_generic():
    """def index_by[K, V](items: list[V], key: Callable[[V], K]) -> dict[K, V]."""
    assert len(index_by.__type_params__) == 2
    k, v = index_by.__type_params__
    hints = get_type_hints(index_by)
    assert hints["items"] == list[v]
    assert get_origin(hints["key"]) is collections.abc.Callable
    assert get_args(hints["key"]) == ([v], k)
    assert hints["return"] == dict[k, v]
