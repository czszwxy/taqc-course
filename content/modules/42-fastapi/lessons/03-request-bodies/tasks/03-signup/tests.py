import importlib

import pytest
from fastapi.testclient import TestClient

import solution
from security import hash_password

PASSWORD = "s3cret-pass"


@pytest.fixture
def client():
    # A fresh module for every test: USERS starts empty.
    return TestClient(importlib.reload(solution).app)


def signup(client, **changes):
    body = {"email": "anna@example.com", "password": PASSWORD, "name": "Anna", **changes}
    return client.post("/users", json=body)


def test_signup_returns_201_and_public_fields(client):
    """201 і рівно {"id", "email", "name"} — без password і password_hash."""
    response = signup(client)
    assert response.status_code == 201
    assert response.json() == {"id": 1, "email": "anna@example.com", "name": "Anna"}


def test_email_is_normalized(client):
    """EmailStr прибирає пробіли й знижує лише домен — частину до @ переведи в нижній регістр field_validator-ом."""
    response = signup(client, email="  Anna@Example.COM ")
    assert response.status_code == 201
    assert response.json()["email"] == "anna@example.com"


def test_invalid_email(client):
    """email — EmailStr: "anna.example.com" без @ — 422."""
    assert signup(client, email="anna.example.com").status_code == 422


def test_password_min_length(client):
    """Пароль від 8 символів: 7 — 422, 8 — 201."""
    assert signup(client, password="x" * 7).status_code == 422
    assert signup(client, password="x" * 8).status_code == 201


def test_name_length(client):
    """name від 1 до 50 символів."""
    assert signup(client, name="").status_code == 422
    assert signup(client, name="N" * 51).status_code == 422
    assert signup(client, name="N" * 50).status_code == 201


def test_only_the_hash_is_stored(client):
    """У USERS — password_hash = hash_password(пароль), а самого пароля немає."""
    signup(client)
    stored = solution.USERS[1]
    assert stored["password_hash"] == hash_password(PASSWORD)
    assert "password" not in stored
    assert PASSWORD not in stored.values()


def test_get_user_does_not_leak_the_hash(client):
    """GET /users/1 — теж UserOut: password_hash не повертається."""
    signup(client)
    response = client.get("/users/1")
    assert response.status_code == 200
    assert response.json() == {"id": 1, "email": "anna@example.com", "name": "Anna"}


def test_get_missing_user_is_404(client):
    """Неіснуючий користувач — 404 "User not found"."""
    response = client.get("/users/3")
    assert response.status_code == 404
    assert response.json() == {"detail": "User not found"}
