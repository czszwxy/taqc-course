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


def test_register_returns_saved_user(session):
    user = UserService(session).register("anna@shop.ua", "Anna")
    assert user.id is not None


# твій код тут
