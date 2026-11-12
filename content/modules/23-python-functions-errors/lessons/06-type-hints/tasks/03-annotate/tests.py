from typing import get_type_hints

from solution import full_name, index_by_id, pass_rate


def test_full_name_works():
    assert full_name("Olena", "Shevchenko") == "Olena Shevchenko"
    assert full_name("Olena", "Shevchenko", "Petrivna") == "Olena Petrivna Shevchenko"


def test_full_name_hints():
    """middle може бути None — str | None; не забудь -> str."""
    assert get_type_hints(full_name) == {"first": str, "last": str, "middle": str | None, "return": str}


def test_pass_rate_works():
    assert pass_rate(["passed", "failed", "passed", "passed"]) == 75.0
    assert pass_rate([]) == 0.0


def test_pass_rate_hints():
    """results — список рядків (list[str]), результат — float."""
    assert get_type_hints(pass_rate) == {"results": list[str], "return": float}


def test_index_by_id_hints():
    """users — list[dict], результат — dict[int, dict]."""
    assert get_type_hints(index_by_id) == {"users": list[dict], "return": dict[int, dict]}


def test_index_by_id_works():
    users = [{"id": 42, "email": "qa@example.test"}]
    assert index_by_id(users) == {42: {"id": 42, "email": "qa@example.test"}}
