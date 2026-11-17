import sqlite3

import pytest

from solution import save_products


@pytest.fixture
def db_path(tmp_path):
    path = tmp_path / "shop.db"
    conn = sqlite3.connect(path)
    conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT NOT NULL, price INTEGER NOT NULL)")
    conn.commit()
    conn.close()
    return path


@pytest.fixture
def conn(db_path):
    conn = sqlite3.connect(db_path)
    yield conn
    conn.close()


PRICE_LIST = [
    {"sku": "KB-01", "name": "Keyboard", "price": 1500},
    {"sku": "MS-01", "name": "Mouse", "price": 400},
    {"sku": "HB-01", "name": "Hub 'Travel'", "price": 700},
]


def saved_rows(db_path):
    other = sqlite3.connect(db_path)
    try:
        return other.execute("SELECT sku, name, price FROM products ORDER BY sku").fetchall()
    finally:
        other.close()


def test_returns_number_of_rows(conn):
    assert save_products(conn, PRICE_LIST) == 3


def test_rows_are_committed(conn, db_path):
    """Друге з'єднання бачить лише зафіксовані зміни — потрібен commit."""
    save_products(conn, PRICE_LIST)
    assert saved_rows(db_path) == [("HB-01", "Hub 'Travel'", 700), ("KB-01", "Keyboard", 1500), ("MS-01", "Mouse", 400)]


def test_empty_price_list(conn, db_path):
    assert save_products(conn, []) == 0
    assert saved_rows(db_path) == []
