from typing import get_type_hints

from solution import average, find_user, tag_counts


def test_average_hints():
    """values — list[float]; для порожнього списку None, тому -> float | None."""
    assert get_type_hints(average) == {"values": list[float], "return": float | None}


def test_find_user_hints():
    """users — list[dict], email — str, результат — dict | None."""
    assert get_type_hints(find_user) == {"users": list[dict], "email": str, "return": dict | None}


def test_tag_counts_hints():
    assert get_type_hints(tag_counts) == {"tags": list[str], "return": dict[str, int]}


def test_functions_still_work():
    assert average([1.0, 2.0]) == 1.5
    assert average([]) is None
    assert find_user([{"email": "qa@example.test"}], "qa@example.test") == {"email": "qa@example.test"}
    assert tag_counts(["smoke", "smoke"]) == {"smoke": 2}
