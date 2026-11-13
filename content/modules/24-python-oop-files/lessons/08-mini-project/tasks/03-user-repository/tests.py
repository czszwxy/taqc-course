import csv

from models import User
from solution import UserRepository

USERS = [
    User(1, "qa@example.test"),
    User(2, "boss@example.test", "admin", False),
    User(3, "dev@example.test"),
]


def test_len():
    assert len(UserRepository(USERS)) == 3


def test_contains_ignores_case_and_spaces():
    """__contains__ нормалізує email так само, як find."""
    repo = UserRepository(USERS)
    assert " QA@Example.test" in repo
    assert "nobody@example.test" not in repo


def test_find():
    repo = UserRepository(USERS)
    assert repo.find("BOSS@example.test ") == USERS[1]
    assert repo.find("nobody@example.test") is None


def test_active():
    assert [u.id for u in UserRepository(USERS).active()] == [1, 3]


def test_count_by_role():
    """Словник-лічильник у порядку першої появи."""
    assert UserRepository(USERS).count_by_role() == {"customer": 2, "admin": 1}


def test_own_copy_of_list():
    """Зберігай копію: self._users = list(users)."""
    users = list(USERS)
    repo = UserRepository(users)
    users.append(User(9, "late@example.test"))
    assert len(repo) == 3


def test_export_csv(tmp_path):
    """Заголовок id,email,role,active; active — yes / no."""
    path = tmp_path / "users.csv"
    UserRepository(USERS).export_csv(path)
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    assert rows[0] == {"id": "1", "email": "qa@example.test", "role": "customer", "active": "yes"}
    assert rows[1]["active"] == "no"
    assert len(rows) == 3


def test_empty_repository(tmp_path):
    repo = UserRepository([])
    assert len(repo) == 0
    assert not repo
    assert repo.count_by_role() == {}
