import json

from solution import load_active_emails


def write_users(tmp_path, users):
    path = tmp_path / "users.json"
    path.write_text(json.dumps({"users": users}, ensure_ascii=False), encoding="utf-8")
    return path


def test_active_only_lowercase(tmp_path):
    path = write_users(tmp_path, [
        {"email": "QA@Example.test", "active": True},
        {"email": "old@example.test", "active": False},
        {"email": "dev@example.test", "active": True},
    ])
    assert load_active_emails(path) == ["qa@example.test", "dev@example.test"]


def test_no_users(tmp_path):
    assert load_active_emails(write_users(tmp_path, [])) == []


def test_cyrillic_file(tmp_path):
    """Відкривай файл з encoding="utf-8"."""
    path = write_users(tmp_path, [{"email": "olena@example.test", "active": True, "name": "Олена"}])
    assert load_active_emails(path) == ["olena@example.test"]
