import pytest

from solution import LRUCache


def test_get_and_put():
    cache = LRUCache(2)
    assert cache.put("MOUSE-01", 899) is None
    assert cache.get("MOUSE-01") == 899
    assert cache.get("NOPE") is None


def test_evicts_least_recently_used():
    """Без звернень найстаріший — той, що доданий першим."""
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    assert cache.put("c", 3) == "a"
    assert "a" not in cache
    assert cache.get("b") == 2 and cache.get("c") == 3


def test_get_refreshes():
    """get робить запис найсвіжішим: після get("a") викидається "b"."""
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.get("a")
    assert cache.put("c", 3) == "b"
    assert cache.get("a") == 1


def test_update_refreshes_and_keeps_size():
    """put наявного ключа оновлює значення, робить його свіжим і нічого не викидає."""
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    assert cache.put("a", 10) is None
    assert len(cache) == 2
    assert cache.put("c", 3) == "b"
    assert cache.get("a") == 10


def test_contains_does_not_refresh():
    """"key in cache" лише дивиться — порядок не змінюється."""
    cache = LRUCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    assert "a" in cache
    assert cache.put("c", 3) == "a"


def test_len():
    cache = LRUCache(3)
    assert len(cache) == 0
    for key in "abcde":
        cache.put(key, key)
    assert len(cache) == 3


def test_capacity_one():
    cache = LRUCache(1)
    cache.put("a", 1)
    assert cache.put("b", 2) == "a"
    assert cache.get("b") == 2 and len(cache) == 1


def test_falsy_values_are_stored():
    """Значення 0 — теж значення: перевіряй наявність ключа, а не правдивість значення."""
    cache = LRUCache(2)
    cache.put("free-shipping", 0)
    assert cache.get("free-shipping") == 0
    cache.put("x", 1)
    assert cache.put("y", 2) == "free-shipping"


@pytest.mark.parametrize("capacity", [0, -1])
def test_bad_capacity(capacity):
    with pytest.raises(ValueError):
        LRUCache(capacity)
