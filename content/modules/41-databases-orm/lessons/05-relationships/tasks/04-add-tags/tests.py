import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from models import Base, Product, Tag, product_tags
from solution import add_tags


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


@pytest.fixture
def session(engine):
    with Session(engine) as session:
        session.add_all([Product(sku="KB-01"), Product(sku="MS-01", tags=[Tag(name="usb")])])
        session.commit()
        yield session


def tag_names(session):
    return session.scalars(select(Tag.name).order_by(Tag.name)).all()


def test_new_tags_are_created_and_saved(engine, session):
    assert add_tags(session, "KB-01", ["wireless", "mechanical"]) == ["mechanical", "wireless"]
    session.close()
    with Session(engine) as other:
        product = other.scalars(select(Product).where(Product.sku == "KB-01")).one()
        assert sorted(tag.name for tag in product.tags) == ["mechanical", "wireless"], "зміни мають бути збережені (commit)"


def test_existing_tag_is_reused(session):
    """Тег `usb` уже є в базі — другий `Tag(name='usb')` порушить UNIQUE."""
    assert add_tags(session, "KB-01", ["usb"]) == ["usb"]
    assert tag_names(session) == ["usb"]


def test_names_are_normalized_and_deduplicated(session):
    assert add_tags(session, "KB-01", ["USB", " Wireless ", "usb", "wireless"]) == ["usb", "wireless"]
    assert tag_names(session) == ["usb", "wireless"]


def test_tag_already_on_product_is_not_added_twice(session):
    """MS-01 уже має `usb`: у сполучній таблиці не має з'явитися другий такий рядок."""
    assert add_tags(session, "MS-01", ["usb", "travel"]) == ["travel", "usb"]
    assert session.scalar(select(func.count()).select_from(product_tags)) == 2


def test_unknown_product(session):
    with pytest.raises(LookupError):
        add_tags(session, "NOPE", ["usb"])
