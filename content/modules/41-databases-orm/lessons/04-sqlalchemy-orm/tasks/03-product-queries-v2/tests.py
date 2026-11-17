import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from models import Base, Customer
from solution import active_in_city, deactivate, get_by_email, register


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


def test_register_normalizes_and_commits(engine, session):
    customer = register(session, "  Anna@Shop.UA ", "Anna", "Lviv")
    assert customer.id is not None
    session.close()
    with Session(engine) as other:
        assert other.scalars(select(Customer.email)).all() == ["anna@shop.ua"], "email без пробілів і в нижньому регістрі, збережений через commit"


def test_register_without_city(session):
    assert register(session, "ivan@shop.ua", "Ivan").city is None


def test_get_by_email_normalizes_the_query(session):
    """Шукай за тим самим нормалізованим email, що й при реєстрації."""
    register(session, "anna@shop.ua", "Anna")
    found = get_by_email(session, " ANNA@shop.ua")
    assert isinstance(found, Customer)
    assert found.name == "Anna"


def test_get_by_email_missing(session):
    assert get_by_email(session, "nobody@shop.ua") is None


def test_active_in_city(session):
    """Лише активні клієнти цього міста, за іменем."""
    session.add_all([
        Customer(email="o@shop.ua", name="Olha", city="Lviv"),
        Customer(email="a@shop.ua", name="Andrii", city="Lviv"),
        Customer(email="p@shop.ua", name="Petro", city="Kyiv"),
        Customer(email="b@shop.ua", name="Bohdan", city="Lviv", is_active=False),
        Customer(email="n@shop.ua", name="Nadia"),
    ])
    session.commit()
    assert [customer.name for customer in active_in_city(session, "Lviv")] == ["Andrii", "Olha"]
    assert list(active_in_city(session, "Odesa")) == []


def test_deactivate_commits(engine, session):
    customer = register(session, "anna@shop.ua", "Anna")
    customer_id = customer.id
    assert deactivate(session, customer_id) is True
    session.close()
    with Session(engine) as other:
        assert other.get(Customer, customer_id).is_active is False, "зміна має бути збережена (commit)"


def test_deactivate_missing(session):
    assert deactivate(session, 999) is False
