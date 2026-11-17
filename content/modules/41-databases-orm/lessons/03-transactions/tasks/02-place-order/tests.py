import sqlite3

import pytest

from errors import OutOfStock
from solution import place_order


@pytest.fixture
def db_path(tmp_path):
    path = tmp_path / "shop.db"
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE products (id INTEGER PRIMARY KEY, sku TEXT, stock INTEGER NOT NULL);
        CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL);
        CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, quantity INTEGER);
        INSERT INTO products VALUES (10, 'KB-01', 5), (11, 'MS-01', 1);
        """
    )
    conn.close()
    return path


@pytest.fixture
def conn(db_path):
    conn = sqlite3.connect(db_path)
    yield conn
    conn.close()


def state(connection):
    stock = connection.execute("SELECT id, stock FROM products ORDER BY id").fetchall()
    orders = connection.execute("SELECT COUNT(*) FROM orders").fetchone()[0]
    items = connection.execute("SELECT order_id, product_id, quantity FROM order_items ORDER BY product_id").fetchall()
    return stock, orders, items


def committed_state(db_path):
    other = sqlite3.connect(db_path)
    try:
        return state(other)
    finally:
        other.close()


def test_order_is_placed_and_committed(conn, db_path):
    """Друге з'єднання бачить лише зафіксоване — потрібен commit."""
    order_id = place_order(conn, 1, [(10, 2), (11, 1)])
    assert order_id == 1
    assert committed_state(db_path) == ([(10, 3), (11, 0)], 1, [(1, 10, 2), (1, 11, 1)])


def test_out_of_stock_changes_nothing(conn, db_path):
    """Товару 11 замало: склад товару 10 не має зменшитись, замовлення не має з'явитись."""
    with pytest.raises(OutOfStock) as caught:
        place_order(conn, 1, [(10, 1), (11, 2)])
    assert caught.value.product_id == 11
    untouched = ([(10, 5), (11, 1)], 0, [])
    assert state(conn) == untouched, "у цьому з'єднанні лишились незавершені зміни — потрібен rollback"
    assert committed_state(db_path) == untouched


def test_unknown_product_is_out_of_stock(conn):
    with pytest.raises(OutOfStock) as caught:
        place_order(conn, 1, [(99, 1)])
    assert caught.value.product_id == 99


def test_connection_still_works_after_failure(conn, db_path):
    """Після відкату наступне замовлення має пройти й зберегтися."""
    with pytest.raises(OutOfStock):
        place_order(conn, 1, [(10, 1), (11, 2)])
    place_order(conn, 2, [(10, 5)])
    stock, orders, items = committed_state(db_path)
    assert (stock, orders) == ([(10, 0), (11, 1)], 1)
