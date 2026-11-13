import json

from models import User
from solution import load_users


def write_json(tmp_path, records):
    path = tmp_path / "users.json"
    path.write_text(json.dumps(records, ensure_ascii=False), encoding="utf-8")
    return path


def test_all_valid(tmp_path):
    path = write_json(tmp_path, [{"id": 1, "email": "qa@example.test"}, {"id": 2, "email": "dev@example.test", "role": "admin"}])
    users, errors = load_users(path)
    assert users == [User(1, "qa@example.test"), User(2, "dev@example.test", "admin")]
    assert errors == []


def test_collects_errors_and_continues(tmp_path):
    """Зламаний запис не зупиняє завантаження: try / except усередині циклу."""
    path = write_json(tmp_path, [{"id": 1, "email": "broken"}, {"id": 2, "email": "ok@example.test"}])
    users, errors = load_users(path)
    assert users == [User(2, "ok@example.test")]
    assert errors == ["record 1: invalid email: 'broken'"]


def test_numbering_from_one(tmp_path):
    """Номери записів — з 1: enumerate(..., start=1)."""
    path = write_json(tmp_path, [{"id": 1, "email": "a@example.test"}, {"id": 2}, {"id": "3", "email": "c@example.test"}])
    users, errors = load_users(path)
    assert errors == ["record 2: missing field: email", "record 3: id must be an integer"]


def test_duplicate_email(tmp_path):
    """Дублікат після нормалізації — помилка, перший користувач лишається."""
    path = write_json(tmp_path, [{"id": 1, "email": "qa@example.test"}, {"id": 3, "email": " QA@example.test "}])
    users, errors = load_users(path)
    assert [u.id for u in users] == [1]
    assert errors == ["record 2: duplicate email 'qa@example.test'"]


def test_empty_file_list(tmp_path):
    assert load_users(write_json(tmp_path, [])) == ([], [])
