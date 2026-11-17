import sqlite3

import pytest

from errors import NotEnoughPoints, UnknownCustomer
from solution import transfer_points


@pytest.fixture
def db_path(tmp_path):
    path = tmp_path / "loyalty.db"
    conn = sqlite3.connect(path)
    conn.executescript(
        """
        CREATE TABLE customers (id INTEGER PRIMARY KEY, points INTEGER NOT NULL);
        CREATE TABLE transfers (from_id INTEGER, to_id INTEGER, points INTEGER);
        INSERT INTO customers VALUES (1, 100), (2, 20);
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
    points = connection.execute("SELECT id, points FROM customers ORDER BY id").fetchall()
    transfers = connection.execute("SELECT from_id, to_id, points FROM transfers").fetchall()
    return points, transfers


def committed_state(db_path):
    other = sqlite3.connect(db_path)
    try:
        return state(other)
    finally:
        other.close()


UNTOUCHED = ([(1, 100), (2, 20)], [])


def test_transfer_is_committed(conn, db_path):
    transfer_points(conn, 1, 2, 30)
    assert committed_state(db_path) == ([(1, 70), (2, 50)], [(1, 2, 30)])


def test_whole_balance_can_be_sent(conn, db_path):
    """`points >= ?`: можна переказати рівно стільки, скільки є."""
    transfer_points(conn, 2, 1, 20)
    assert committed_state(db_path)[0] == [(1, 120), (2, 0)]


def test_not_enough_points(conn, db_path):
    with pytest.raises(NotEnoughPoints) as caught:
        transfer_points(conn, 2, 1, 21)
    assert caught.value.customer_id == 2
    assert committed_state(db_path) == UNTOUCHED


def test_unknown_receiver_rolls_back_the_debit(conn, db_path):
    """Списання вже відбулося, коли з'ясувалося, що отримувача немає — його треба відкотити."""
    with pytest.raises(UnknownCustomer) as caught:
        transfer_points(conn, 1, 99, 30)
    assert caught.value.customer_id == 99
    assert state(conn) == UNTOUCHED, "у цьому з'єднанні лишилось списання — потрібен rollback"
    assert committed_state(db_path) == UNTOUCHED


def test_points_must_be_positive(conn, db_path):
    """Від'ємний переказ «забрав» би бали в отримувача."""
    for bad in (0, -50):
        with pytest.raises(ValueError):
            transfer_points(conn, 1, 2, bad)
    assert committed_state(db_path) == UNTOUCHED
