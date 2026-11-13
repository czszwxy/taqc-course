import json

from solution import save_json


def test_round_trip(tmp_path):
    path = tmp_path / "data.json"
    data = {"city": "Київ", "tags": ["smoke"], "count": 2}
    save_json(path, data)
    assert json.loads(path.read_text(encoding="utf-8")) == data


def test_cyrillic_as_is(tmp_path):
    """ensure_ascii=False — кирилиця без \\u-послідовностей."""
    path = tmp_path / "data.json"
    save_json(path, {"city": "Київ"})
    assert "Київ" in path.read_text(encoding="utf-8")


def test_indented(tmp_path):
    """indent=2 — кожен ключ на новому рядку з двома пробілами."""
    path = tmp_path / "data.json"
    save_json(path, {"a": 1})
    assert '\n  "a": 1' in path.read_text(encoding="utf-8")
