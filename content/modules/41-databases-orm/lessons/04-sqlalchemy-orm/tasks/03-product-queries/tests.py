import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from models import Base, Product
from solution import add_product, cheapest_in_category, find_by_sku, mark_sold_out


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


@pytest.fixture
def catalog(session):
    session.add_all([
        Product(sku="MS-03", name="Silent mouse", price=650, category="mice"),
        Product(sku="MS-01", name="Mouse", price=400, category="mice"),
        Product(sku="MS-02", name="Travel mouse", price=400, category="mice"),
        Product(sku="MS-00", name="Old mouse", price=150, category="mice", in_stock=False),
        Product(sku="MS-04", name="Gaming mouse", price=1900, category="mice"),
        Product(sku="KB-01", name="Keyboard", price=300, category="keyboards"),
    ])
    session.commit()


def skus(products):
    return [product.sku for product in products]


def test_add_product_returns_saved_product(session):
    product = add_product(session, "HB-01", "USB hub", 700, "hubs")
    assert isinstance(product, Product)
    assert product.id is not None, "після commit у товару має бути id"


def test_add_product_commits(engine, session):
    """Тест закриває сесію і відкриває нову: без commit товару не буде."""
    add_product(session, "HB-01", "USB hub", 700, "hubs")
    session.close()
    with Session(engine) as other:
        assert other.scalars(select(Product.sku)).all() == ["HB-01"]


def test_find_by_sku(session, catalog):
    found = find_by_sku(session, "KB-01")
    assert isinstance(found, Product), "поверни об'єкт Product, а не рядок-кортеж (scalars, а не execute)"
    assert found.name == "Keyboard"


def test_find_by_sku_missing(session, catalog):
    assert find_by_sku(session, "NOPE") is None


def test_cheapest_in_category_sorted_with_tie_breaker(session, catalog):
    """Лише в наявності (MS-00 немає), за ціною, а при рівній ціні — за sku."""
    assert skus(cheapest_in_category(session, "mice")) == ["MS-01", "MS-02", "MS-03"]


def test_cheapest_in_category_limit(session, catalog):
    assert skus(cheapest_in_category(session, "mice", limit=1)) == ["MS-01"]
    assert skus(cheapest_in_category(session, "mice", limit=10)) == ["MS-01", "MS-02", "MS-03", "MS-04"]


def test_cheapest_in_unknown_category(session, catalog):
    assert list(cheapest_in_category(session, "tablets")) == []


def test_mark_sold_out_commits(engine, session, catalog):
    assert mark_sold_out(session, "MS-01") is True
    session.close()
    with Session(engine) as other:
        product = other.scalars(select(Product).where(Product.sku == "MS-01")).one()
        assert product.in_stock is False, "зміна має бути збережена (commit)"


def test_mark_sold_out_missing(session, catalog):
    assert mark_sold_out(session, "NOPE") is False
