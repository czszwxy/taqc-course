import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from models import Base, Customer, Order
from solution import customer_stats


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        session.add_all([
            Customer(id=1, email="ivan@shop.ua"),
            Customer(id=2, email="anna@shop.ua"),
            Customer(id=3, email="olha@shop.ua"),
            Customer(id=4, email="bohdan@shop.ua"),
        ])
        session.add_all([
            Order(customer_id=2, total=500),
            Order(customer_id=3, total=90),
            Order(customer_id=2, total=1200),
            Order(customer_id=4, total=300),
        ])
        session.commit()
        yield session


def test_stats(session):
    assert customer_stats(session) == [
        ("anna@shop.ua", 2, 1700),
        ("bohdan@shop.ua", 1, 300),
        ("olha@shop.ua", 1, 90),
        ("ivan@shop.ua", 0, 0),
    ]


def test_customer_without_orders_has_zeros(session):
    """`count(Order.id)` дає 0 (а `count()` — 1), `coalesce(sum, 0)` дає 0 замість None."""
    assert ("ivan@shop.ua", 0, 0) in customer_stats(session)


def test_no_customers(engine):
    with Session(engine) as session:
        assert customer_stats(session) == []


def test_one_query(engine, session):
    statements = []
    event.listen(engine, "before_cursor_execute", lambda conn, cursor, statement, *rest: statements.append(statement))
    customer_stats(session)
    assert len(statements) == 1, f"{len(statements)} SQL queries — expected one SELECT with OUTER JOIN and GROUP BY"
