import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from models import Base
from subject import EmailTaken, UserService


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
def service(session):
    return UserService(session)


def test_register_returns_saved_user(session):
    user = UserService(session).register("anna@shop.ua", "Anna")
    assert user.id is not None


def test_find_normalizes_email(service):
    service.register("anna@shop.ua", "Anna")
    assert service.find("  ANNA@Shop.ua ").name == "Anna"


def test_duplicate_email_is_rejected(service):
    service.register("anna@shop.ua", "Anna")
    with pytest.raises(EmailTaken):
        service.register("Anna@shop.ua", "Copy")


def test_deactivate_is_saved(engine, session, service):
    service.register("anna@shop.ua", "Anna")
    assert service.deactivate("anna@shop.ua") is True
    session.close()
    with Session(engine) as fresh:
        assert UserService(fresh).active_emails() == []


def test_active_emails_sorted_without_inactive(service):
    for email in ["olha@shop.ua", "anna@shop.ua", "ivan@shop.ua", "bohdan@shop.ua"]:
        service.register(email, "User")
    service.deactivate("ivan@shop.ua")
    assert service.active_emails() == ["anna@shop.ua", "bohdan@shop.ua", "olha@shop.ua"]


def test_deactivate_unknown_user(service):
    assert service.deactivate("nobody@shop.ua") is False
