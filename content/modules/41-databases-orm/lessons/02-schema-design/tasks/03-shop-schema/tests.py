import sqlite3

import pytest

from solution import create_schema


@pytest.fixture
def conn():
    conn = sqlite3.connect(":memory:")
    create_schema(conn)
    conn.execute("INSERT INTO users (id, email, name) VALUES (1, 'anna@shop.ua', 'Anna')")
    conn.execute("INSERT INTO products (id, sku, price) VALUES (10, 'KB-01', 1500)")
    conn.execute("INSERT INTO orders (id, user_id) VALUES (100, 1)")
    conn.execute("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (100, 10, 2, 1500)")
    yield conn
    conn.close()


def rejects(conn, sql):
    with pytest.raises(sqlite3.IntegrityError):
        conn.execute(sql)


def test_valid_data_and_default_status(conn):
    assert conn.execute("SELECT status FROM orders WHERE id = 100").fetchone() == ("new",)


def test_email_is_unique(conn):
    rejects(conn, "INSERT INTO users (email, name) VALUES ('anna@shop.ua', 'Copy')")


def test_user_name_is_required(conn):
    rejects(conn, "INSERT INTO users (email) VALUES ('ivan@shop.ua')")


def test_sku_is_unique_and_price_positive(conn):
    rejects(conn, "INSERT INTO products (sku, price) VALUES ('KB-01', 900)")
    rejects(conn, "INSERT INTO products (sku, price) VALUES ('MS-01', 0)")


def test_order_needs_existing_user(conn):
    """Без `PRAGMA foreign_keys = ON` SQLite мовчки прийме замовлення неіснуючого користувача."""
    rejects(conn, "INSERT INTO orders (user_id) VALUES (999)")


def test_unknown_status_is_rejected(conn):
    rejects(conn, "INSERT INTO orders (user_id, status) VALUES (1, 'lost')")
    conn.execute("INSERT INTO orders (user_id, status) VALUES (1, 'shipped')")


def test_quantity_at_least_one(conn):
    conn.execute("INSERT INTO products (id, sku, price) VALUES (11, 'MS-01', 400)")
    rejects(conn, "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (100, 11, 0, 400)")


def test_item_needs_existing_product(conn):
    rejects(conn, "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (100, 77, 1, 400)")


def test_same_product_twice_in_one_order(conn):
    """Складений первинний ключ (order_id, product_id): той самий товар у замовленні — лише один рядок."""
    rejects(conn, "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (100, 10, 1, 1500)")


def test_deleting_order_deletes_its_items(conn):
    """`ON DELETE CASCADE` на `order_items.order_id` (і увімкнені зовнішні ключі)."""
    conn.execute("DELETE FROM orders WHERE id = 100")
    assert conn.execute("SELECT COUNT(*) FROM order_items").fetchone() == (0,)
