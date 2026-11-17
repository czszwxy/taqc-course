import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from solution import Base, Product


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()


def column(name):
    return Product.__table__.c[name]


def test_columns():
    """Потрібні рівно стовпці id, sku, name, price, description, in_stock."""
    assert set(Product.__table__.c.keys()) == {"id", "sku", "name", "price", "description", "in_stock"}


def test_sku_is_unique_string_of_20():
    assert column("sku").unique is True
    assert column("sku").type.length == 20
    assert column("sku").nullable is False


def test_name_is_required_string_of_100():
    assert column("name").type.length == 100
    assert column("name").nullable is False


def test_price_and_in_stock_are_required():
    """`Mapped[int]` і `Mapped[bool]` без `| None` — NOT NULL."""
    assert column("price").nullable is False
    assert column("in_stock").nullable is False


def test_description_is_optional():
    """Необов'язкове поле: `Mapped[str | None]`."""
    assert column("description").nullable is True


def test_saved_product_gets_defaults(engine):
    with Session(engine) as session:
        session.add(Product(sku="KB-01", name="Keyboard", price=1500))
        session.commit()
    with Session(engine) as session:
        product = session.get(Product, 1)
        assert (product.sku, product.name, product.price) == ("KB-01", "Keyboard", 1500)
        assert product.in_stock is True, "in_stock за замовчуванням має бути True"
        assert product.description is None


def test_duplicate_sku_is_rejected(engine):
    """Без `unique=True` база прийме два товари з одним артикулом."""
    with Session(engine) as session:
        session.add_all([Product(sku="KB-01", name="Keyboard", price=1500), Product(sku="KB-01", name="Copy", price=1)])
        with pytest.raises(IntegrityError):
            session.commit()


def test_product_without_name_is_rejected(engine):
    """`name` обов'язковий — база має відхилити товар без назви."""
    with Session(engine) as session:
        session.add(Product(sku="MS-02", price=400))
        with pytest.raises(IntegrityError):
            session.commit()
