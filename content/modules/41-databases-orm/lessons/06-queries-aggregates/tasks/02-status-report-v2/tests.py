import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from models import Base, OrderItem, Product
from solution import top_products


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        session.add_all([Product(id=1, sku="KB-01"), Product(id=2, sku="MS-01"), Product(id=3, sku="HB-01"), Product(id=4, sku="CB-01")])
        session.add_all([
            OrderItem(product_id=2, quantity=4),
            OrderItem(product_id=1, quantity=3),
            OrderItem(product_id=2, quantity=3),
            OrderItem(product_id=4, quantity=3),
        ])
        session.commit()
        yield session


def test_top_two(session):
    assert top_products(session, limit=2) == [("MS-01", 7), ("CB-01", 3)]


def test_ties_by_sku_and_unsold_excluded(session):
    """KB-01 і CB-01 продано по 3 — порядок за sku. HB-01 не продано — його немає."""
    assert top_products(session, limit=10) == [("MS-01", 7), ("CB-01", 3), ("KB-01", 3)]


def test_one_query(engine, session):
    statements = []
    event.listen(engine, "before_cursor_execute", lambda conn, cursor, statement, *rest: statements.append(statement))
    top_products(session)
    assert len(statements) == 1, f"{len(statements)} SQL queries — expected one SELECT with JOIN and GROUP BY"
