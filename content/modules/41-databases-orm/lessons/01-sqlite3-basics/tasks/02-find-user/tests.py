import sqlite3

import pytest

from solution import find_user


@pytest.fixture
def conn():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL)")
    conn.executemany(
        "INSERT INTO users (email, name) VALUES (?, ?)",
        [("anna@shop.ua", "Anna"), ("o'brien@shop.ua", "Sean"), ("ivan@shop.ua", "Ivan")],
    )
    conn.commit()
    yield conn
    conn.close()


def test_finds_user_as_dict(conn):
    assert find_user(conn, "ivan@shop.ua") == {"id": 3, "email": "ivan@shop.ua", "name": "Ivan"}


def test_missing_user(conn):
    assert find_user(conn, "nobody@shop.ua") is None


def test_email_with_apostrophe(conn):
    """Апостроф ламає SQL, склеєний з рядків. Параметр `?` — ні."""
    assert find_user(conn, "o'brien@shop.ua") == {"id": 2, "email": "o'brien@shop.ua", "name": "Sean"}


def test_sql_injection_finds_nobody(conn):
    """`' OR '1'='1` має шукатися як звичайний email, а не ставати частиною SQL."""
    assert find_user(conn, "' OR '1'='1") is None
    assert find_user(conn, "x' OR email LIKE '%") is None
