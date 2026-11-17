import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session

from models import Base, Product, Tag
from solution import catalog


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


def test_small_example(engine):
    with Session(engine) as session:
        usb, wireless = Tag(name="usb"), Tag(name="wireless")
        session.add_all([Product(sku="KB-01", tags=[wireless, usb]), Product(sku="HB-01"), Product(sku="MS-01", tags=[wireless])])
        session.commit()
    with Session(engine) as session:
        assert catalog(session) == [("HB-01", []), ("KB-01", ["usb", "wireless"]), ("MS-01", ["wireless"])]


def test_at_most_two_queries(engine):
    """30 товарів: з лінивим завантаженням це 31 запит. Завантаж теги заздалегідь — selectinload."""
    with Session(engine) as session:
        tags = [Tag(name=f"tag{n}") for n in range(5)]
        session.add_all([Product(sku=f"SKU-{n:02}", tags=[tags[n % 5], tags[(n + 1) % 5]]) for n in range(30)])
        session.commit()
    with Session(engine) as session:
        counter = QueryCounter(engine)
        result = catalog(session)
    assert len(result) == 30
    assert result[4] == ("SKU-04", ["tag0", "tag4"])
    assert len(counter.statements) <= 2, f"{len(counter.statements)} SQL queries for 30 products — N+1"
