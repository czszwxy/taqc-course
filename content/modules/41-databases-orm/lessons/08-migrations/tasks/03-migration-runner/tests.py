import sqlite3

import pytest

from errors import MigrationError
from solution import apply_migrations

M1 = (1, ["CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT NOT NULL)"])
M2 = (2, ["CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL)", "CREATE INDEX ix_orders_user ON orders (user_id)"])
M3 = (3, ["ALTER TABLE users ADD COLUMN phone TEXT"])
M3_BROKEN = (3, ["ALTER TABLE users ADD COLUMN phone TEXT", "INSERT INTO missing_table VALUES (1)"])
M4 = (4, ["ALTER TABLE orders ADD COLUMN total INTEGER NOT NULL DEFAULT 0"])


@pytest.fixture
def db_path(tmp_path):
    return tmp_path / "app.db"


@pytest.fixture
def conn(db_path):
    conn = sqlite3.connect(db_path, autocommit=False)
    yield conn
    conn.close()


def committed(db_path):
    other = sqlite3.connect(db_path)
    try:
        versions = [row[0] for row in other.execute("SELECT version FROM schema_version ORDER BY version")]
        tables = {row[0] for row in other.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        user_columns = [row[1] for row in other.execute("PRAGMA table_info(users)")]
        return versions, tables, user_columns
    finally:
        other.close()


def test_fresh_database(conn, db_path):
    assert apply_migrations(conn, [M1, M2, M3]) == [1, 2, 3]
    versions, tables, user_columns = committed(db_path)
    assert versions == [1, 2, 3]
    assert {"users", "orders", "schema_version"} <= tables
    assert user_columns == ["id", "email", "phone"]


def test_second_run_applies_nothing(conn):
    apply_migrations(conn, [M1, M2])
    assert apply_migrations(conn, [M1, M2]) == []


def test_migrations_run_in_version_order(conn, db_path):
    """Міграція 3 змінює таблицю з міграції 1 — порядок у списку не важливий, важливий номер."""
    assert apply_migrations(conn, [M3, M1, M2]) == [1, 2, 3]
    assert committed(db_path)[2] == ["id", "email", "phone"]


def test_only_new_migrations_are_applied(conn, db_path):
    apply_migrations(conn, [M1, M2])
    assert apply_migrations(conn, [M1, M2, M3, M4]) == [3, 4]
    assert committed(db_path)[0] == [1, 2, 3, 4]


def test_broken_migration_is_rolled_back_and_stops_the_chain(conn, db_path):
    """Перша команда міграції 3 (новий стовпець) має відкотитись разом з версією; міграція 4 — не виконуватись."""
    apply_migrations(conn, [M1, M2])
    with pytest.raises(MigrationError) as caught:
        apply_migrations(conn, [M1, M2, M3_BROKEN, M4])
    assert caught.value.version == 3
    assert isinstance(caught.value.__cause__, sqlite3.Error), "raise MigrationError(version) from err"
    same_connection_columns = [row[1] for row in conn.execute("PRAGMA table_info(users)")]
    assert same_connection_columns == ["id", "email"], "у цьому з'єднанні лишився новий стовпець — потрібен conn.rollback()"
    versions, tables, user_columns = committed(db_path)
    assert versions == [1, 2]
    assert user_columns == ["id", "email"], "ALTER TABLE зламаної міграції не відкотився"
    orders_columns = [row[1] for row in conn.execute("PRAGMA table_info(orders)")]
    assert "total" not in orders_columns, "міграція після зламаної не має виконуватись"


def test_fixed_migration_can_be_applied_later(conn, db_path):
    apply_migrations(conn, [M1, M2])
    with pytest.raises(MigrationError):
        apply_migrations(conn, [M1, M2, M3_BROKEN, M4])
    assert apply_migrations(conn, [M1, M2, M3, M4]) == [3, 4]
    assert committed(db_path)[0] == [1, 2, 3, 4]
