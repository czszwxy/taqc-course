import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from models import Base, Order
from solution import status_report


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        yield session


def test_report(session):
    session.add_all([
        Order(status="new", total=500),
        Order(status="paid", total=900),
        Order(status="new", total=1200),
        Order(status="cancelled", total=300),
    ])
    session.commit()
    assert status_report(session) == {"new": (2, 1700), "paid": (1, 900), "cancelled": (1, 300)}


def test_empty_table(session):
    assert status_report(session) == {}


def test_one_query(engine, session):
    """Агрегати рахує база: один SELECT з GROUP BY, а не завантаження всіх замовлень."""
    session.add_all([Order(status="new", total=n) for n in range(50)])
    session.commit()
    statements = []
    event.listen(engine, "before_cursor_execute", lambda conn, cursor, statement, *rest: statements.append(statement))
    assert status_report(session) == {"new": (50, sum(range(50)))}
    assert len(statements) == 1, f"{len(statements)} SQL queries — expected one SELECT ... GROUP BY"
