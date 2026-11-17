import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from errors import InvalidTransition, OrderNotFound
from models import Base, Order
from solution import OrderRepository


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
def repo(session):
    return OrderRepository(session)


def test_add_assigns_an_id(repo):
    """`flush()` надсилає INSERT — і база видає id ще до commit."""
    order = repo.add("anna@shop.ua", 1500)
    assert order.id == 1
    assert order.status == "new"


def test_add_does_not_commit(repo, session):
    """Репозиторій не фіксує транзакцію: після rollback замовлення зникає."""
    repo.add("anna@shop.ua", 1500)
    session.rollback()
    assert session.scalar(select(func.count()).select_from(Order)) == 0


def test_caller_commits(engine, repo, session):
    repo.add("anna@shop.ua", 1500)
    session.commit()
    with Session(engine) as other:
        assert other.scalar(select(func.count()).select_from(Order)) == 1


def test_get(repo):
    order = repo.add("anna@shop.ua", 1500)
    assert repo.get(order.id) is order


def test_get_missing(repo):
    with pytest.raises(OrderNotFound) as caught:
        repo.get(42)
    assert caught.value.order_id == 42


def test_list_by_status(repo):
    first = repo.add("anna@shop.ua", 100)
    second = repo.add("ivan@shop.ua", 200)
    third = repo.add("olha@shop.ua", 300)
    repo.mark_paid(second.id)
    assert repo.list_by_status("new") == [first, third]
    assert repo.list_by_status("paid") == [second]
    assert repo.list_by_status("shipped") == []


def test_mark_paid_only_from_new(repo):
    order = repo.add("anna@shop.ua", 100)
    repo.mark_paid(order.id)
    assert order.status == "paid"
    with pytest.raises(InvalidTransition) as caught:
        repo.mark_paid(order.id)
    assert (caught.value.order_id, caught.value.status) == (order.id, "paid")


def test_mark_paid_missing(repo):
    with pytest.raises(OrderNotFound):
        repo.mark_paid(7)
