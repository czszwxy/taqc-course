import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models import Base, Product
from solution import product_page

NAMES = [
    "Wireless mouse", "Keyboard", "USB hub", "Gaming Mouse", "Monitor stand", "Webcam",
    "Travel mouse", "Headset", "Laptop stand", "Mouse pad", "Microphone", "Speaker",
]


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        session.add_all([Product(sku=f"P-{n:02}", name=name) for n, name in enumerate(NAMES, start=1)])
        session.commit()
        yield session


def test_first_page(session):
    assert product_page(session, 1) == {"items": ["P-01", "P-02", "P-03", "P-04", "P-05"], "total": 12, "pages": 3}


def test_second_page(session):
    """offset = (page - 1) * per_page."""
    assert product_page(session, 2)["items"] == ["P-06", "P-07", "P-08", "P-09", "P-10"]


def test_last_partial_page(session):
    assert product_page(session, 3)["items"] == ["P-11", "P-12"]


def test_page_beyond_the_end(session):
    assert product_page(session, 4) == {"items": [], "total": 12, "pages": 3}


def test_custom_page_size(session):
    assert product_page(session, 2, per_page=4) == {"items": ["P-05", "P-06", "P-07", "P-08"], "total": 12, "pages": 3}


def test_search_ignores_case_and_counts_matches(session):
    """total і pages рахуються з тим самим фільтром пошуку."""
    assert product_page(session, 1, per_page=3, search="MOUSE") == {"items": ["P-01", "P-04", "P-07"], "total": 4, "pages": 2}
    assert product_page(session, 2, per_page=3, search="mouse")["items"] == ["P-10"]


def test_search_without_matches(session):
    assert product_page(session, 1, search="printer") == {"items": [], "total": 0, "pages": 0}


def test_page_must_start_at_one(session):
    with pytest.raises(ValueError):
        product_page(session, 0)
