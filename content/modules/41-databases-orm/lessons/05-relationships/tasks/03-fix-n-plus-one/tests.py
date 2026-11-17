import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from models import Base, Customer, Order
from solution import order_history


class QueryCounter:
    """Counts the SQL statements an engine sends to the database."""

    def __init__(self, engine):
        self.statements = []
        event.listen(engine, "before_cursor_execute", self._record)

    def _record(self, conn, cursor, statement, parameters, context, executemany):
        self.statements.append(statement)


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


def seed(engine, customers):
    with Session(engine) as session:
        session.add_all(customers)
        session.commit()


def test_small_example(engine):
    seed(engine, [
        Customer(email="ivan@shop.ua"),
        Customer(email="anna@shop.ua", orders=[Order(total=500), Order(total=1200)]),
    ])
    with Session(engine) as session:
        assert order_history(session) == [("anna@shop.ua", [500, 1200]), ("ivan@shop.ua", [])]


def test_empty_database(engine):
    with Session(engine) as session:
        assert order_history(session) == []


def test_at_most_two_queries(engine):
    """30 покупців: з лінивим завантаженням це 31 запит. Завантаж замовлення заздалегідь — selectinload."""
    seed(engine, [
        Customer(email=f"user{n:02}@shop.ua", orders=[Order(total=n * 10), Order(total=n * 10 + 5)])
        for n in range(30)
    ])
    with Session(engine) as session:
        counter = QueryCounter(engine)
        history = order_history(session)
    assert len(history) == 30
    assert history[3] == ("user03@shop.ua", [30, 35])
    assert len(counter.statements) <= 2, f"{len(counter.statements)} SQL queries for 30 customers — N+1"
