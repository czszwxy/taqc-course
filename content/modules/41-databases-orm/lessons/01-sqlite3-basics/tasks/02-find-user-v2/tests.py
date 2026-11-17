import sqlite3

import pytest

from solution import products_in_category


@pytest.fixture
def conn():
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE products (sku TEXT PRIMARY KEY, name TEXT, category TEXT, price INTEGER)")
    conn.executemany(
        "INSERT INTO products VALUES (?, ?, ?, ?)",
        [
            ("MS-03", "Silent mouse", "mice", 650),
            ("MS-01", "Mouse", "mice", 400),
            ("MS-02", "Travel mouse", "mice", 400),
            ("MS-04", "Gaming mouse", "mice", 1900),
            ("KB-01", "Keyboard", "keyboards", 300),
        ],
    )
    yield conn
    conn.close()


def test_all_in_category_sorted(conn):
    """За ціною, а при рівній ціні — за sku."""
    assert products_in_category(conn, "mice") == [
        {"sku": "MS-01", "price": 400},
        {"sku": "MS-02", "price": 400},
        {"sku": "MS-03", "price": 650},
        {"sku": "MS-04", "price": 1900},
    ]


def test_max_price_is_inclusive(conn):
    """«Не більша за» — `<=`, тож товар за 650 при max_price=650 входить."""
    assert [p["sku"] for p in products_in_category(conn, "mice", max_price=650)] == ["MS-01", "MS-02", "MS-03"]


def test_unknown_category(conn):
    assert products_in_category(conn, "tablets") == []


def test_injection_in_category(conn):
    """Категорія-ін'єкція має шукатися як звичайний рядок."""
    assert products_in_category(conn, "x' OR '1'='1") == []
