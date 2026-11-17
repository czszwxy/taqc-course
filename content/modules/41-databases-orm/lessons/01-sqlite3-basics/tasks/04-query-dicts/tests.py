import sqlite3

import pytest

from solution import query_dicts


@pytest.fixture
def conn():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, price INTEGER)")
    conn.executemany("INSERT INTO products VALUES (?, ?, ?)", [("KB-01", "Keyboard", 1500), ("MS-01", "Mouse", 400)])
    yield conn
    conn.close()


def test_rows_become_dicts(conn):
    assert query_dicts(conn, "SELECT sku, name, price FROM products ORDER BY sku") == [
        {"sku": "KB-01", "name": "Keyboard", "price": 1500},
        {"sku": "MS-01", "name": "Mouse", "price": 400},
    ]


def test_aliases_and_params(conn):
    """Імена — з `cursor.description`, тож `AS amount` дає ключ `amount`."""
    assert query_dicts(conn, "SELECT sku, price AS amount FROM products WHERE price > ?", (500,)) == [{"sku": "KB-01", "amount": 1500}]


def test_named_params(conn):
    assert query_dicts(conn, "SELECT COUNT(*) AS total FROM products WHERE price < :limit", {"limit": 1000}) == [{"total": 1}]


def test_no_rows(conn):
    assert query_dicts(conn, "SELECT sku FROM products WHERE price > 9999") == []


def test_connection_is_not_changed(conn):
    """Помічник не має змінювати `conn.row_factory` — інший код чекає кортежі."""
    query_dicts(conn, "SELECT sku FROM products")
    assert conn.row_factory is None
    assert conn.execute("SELECT sku FROM products ORDER BY sku").fetchone() == ("KB-01",)
