from solution import json_paths


def test_example():
    data = {"id": 7, "user": {"email": "qa@gadgetly.test"}, "tags": ["new", "sale"], "meta": {}}
    assert json_paths(data) == {
        "$.id": 7,
        "$.user.email": "qa@gadgetly.test",
        "$.tags[0]": "new",
        "$.tags[1]": "sale",
        "$.meta": {},
    }


def test_list_of_dicts():
    assert json_paths({"items": [{"id": 1}, {"id": 2, "inStock": False}]}) == {
        "$.items[0].id": 1,
        "$.items[1].id": 2,
        "$.items[1].inStock": False,
    }


def test_empty_containers_are_kept():
    """Порожній словник чи список — лист: {path: {}} або {path: []}."""
    assert json_paths({"tags": [], "meta": {}}) == {"$.tags": [], "$.meta": {}}


def test_falsy_leaves_are_kept():
    """0, False, None і "" — звичайні значення, вони не зникають."""
    assert json_paths({"a": 0, "b": False, "c": None, "d": ""}) == {"$.a": 0, "$.b": False, "$.c": None, "$.d": ""}


def test_top_level_value():
    assert json_paths(42) == {"$": 42}


def test_top_level_list():
    assert json_paths([[1], 2]) == {"$[0][0]": 1, "$[1]": 2}
