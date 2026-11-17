import sqlite3

import pytest

from errors import EmailTaken
from solution import register_user


@pytest.fixture
def db_path(tmp_path):
    path = tmp_path / "users.db"
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL)")
    conn.close()
    return path


@pytest.fixture
def conn(db_path):
    conn = sqlite3.connect(db_path)
    yield conn
    conn.close()


def committed_users(db_path):
    other = sqlite3.connect(db_path)
    try:
        return other.execute("SELECT id, email, name FROM users ORDER BY id").fetchall()
    finally:
        other.close()


def test_register_normalizes_and_commits(conn, db_path):
    assert register_user(conn, "  Anna@Shop.UA ", "Anna") == 1
    assert committed_users(db_path) == [(1, "anna@shop.ua", "Anna")]


def test_duplicate_email_raises_domain_error(conn):
    """Той самий email в іншому регістрі — теж дубль, бо email нормалізується."""
    register_user(conn, "anna@shop.ua", "Anna")
    with pytest.raises(EmailTaken) as caught:
        register_user(conn, "ANNA@shop.ua", "Copy")
    assert caught.value.email == "anna@shop.ua"


def test_original_error_is_the_cause(conn):
    """`raise EmailTaken(email) from err` — IntegrityError лишається в `__cause__`."""
    register_user(conn, "anna@shop.ua", "Anna")
    with pytest.raises(EmailTaken) as caught:
        register_user(conn, "anna@shop.ua", "Copy")
    assert isinstance(caught.value.__cause__, sqlite3.IntegrityError)


def test_connection_works_after_duplicate(conn, db_path):
    """Після невдалої вставки наступна реєстрація має пройти й зафіксуватися."""
    register_user(conn, "anna@shop.ua", "Anna")
    with pytest.raises(EmailTaken):
        register_user(conn, "anna@shop.ua", "Copy")
    assert register_user(conn, "ivan@shop.ua", "Ivan") == 2
    assert committed_users(db_path) == [(1, "anna@shop.ua", "Anna"), (2, "ivan@shop.ua", "Ivan")]
