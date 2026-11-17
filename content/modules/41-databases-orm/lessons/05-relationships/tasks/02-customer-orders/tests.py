import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from solution import Base, Customer, Order


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


def order_count(session):
    return session.scalar(select(func.count()).select_from(Order))


def test_customer_id_is_a_required_foreign_key():
    column = Order.__table__.c.customer_id
    assert [fk.target_fullname for fk in column.foreign_keys] == ["customers.id"]
    assert column.nullable is False, "замовлення без покупця не має бути: Mapped[int], не Mapped[int | None]"


def test_sides_are_linked_in_memory():
    """`back_populates` з обох боків: зміна однієї сторони одразу видна з іншої — ще без бази."""
    anna = Customer(email="anna@shop.ua")
    order = Order(total=500)
    order.customer = anna
    assert anna.orders == [order]


def test_orders_are_saved_with_the_customer(engine, session):
    anna = Customer(email="anna@shop.ua", orders=[Order(total=500)])
    anna.orders.append(Order(total=1200))
    session.add(anna)
    session.commit()
    with Session(engine) as other:
        orders = other.scalars(select(Order).order_by(Order.id)).all()
        assert [(order.total, order.customer.email) for order in orders] == [(500, "anna@shop.ua"), (1200, "anna@shop.ua")]


def test_deleting_customer_deletes_orders(session):
    """Без каскаду SQLAlchemy поставить замовленням customer_id = NULL — і обов'язковий стовпець не дозволить."""
    anna = Customer(email="anna@shop.ua", orders=[Order(total=500), Order(total=1200)])
    session.add_all([anna, Customer(email="ivan@shop.ua", orders=[Order(total=90)])])
    session.commit()
    session.delete(anna)
    session.commit()
    assert order_count(session) == 1


def test_removed_order_is_deleted(session):
    """`delete-orphan`: замовлення, прибране зі списку покупця, видаляється."""
    anna = Customer(email="anna@shop.ua", orders=[Order(total=500), Order(total=1200)])
    session.add(anna)
    session.commit()
    anna.orders.pop(0)
    session.commit()
    assert order_count(session) == 1


def test_order_without_customer_is_rejected(session):
    session.add(Order(total=10))
    with pytest.raises(IntegrityError):
        session.commit()
