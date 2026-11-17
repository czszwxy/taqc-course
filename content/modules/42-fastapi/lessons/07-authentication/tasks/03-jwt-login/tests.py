from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from security import ALGORITHM, SECRET_KEY
from solution import app

client = TestClient(app)

OTHER_KEY = "someone-else-1f2e3d4c5b6a79881726354433221100"


def login(username="anna", password="anna-pass-123"):
    return client.post("/token", data={"username": username, "password": password})


def token_for(sub, minutes=15, key=SECRET_KEY):
    return jwt.encode({"sub": sub, "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes)}, key, algorithm=ALGORITHM)


def me(token):
    return client.get("/me", headers={"Authorization": f"Bearer {token}"})


def assert_bad_credentials(response):
    assert response.status_code == 401, response.json()
    assert response.json() == {"detail": "Could not validate credentials"}
    assert response.headers.get("www-authenticate") == "Bearer"


def test_login_returns_a_bearer_token():
    """Правильна пара — 200, {"access_token": ..., "token_type": "bearer"}."""
    response = login()
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert isinstance(body["access_token"], str)


def test_token_has_sub_and_exp():
    """У токені sub = username і exp приблизно через 15 хвилин (ACCESS_TOKEN_MINUTES)."""
    payload = jwt.decode(login().json()["access_token"], SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "anna"
    seconds_left = payload["exp"] - datetime.now(timezone.utc).timestamp()
    assert 14 * 60 < seconds_left <= 15 * 60 + 5


def test_wrong_password_is_401():
    """Неправильний пароль — 401 "Incorrect username or password" з WWW-Authenticate: Bearer."""
    response = login(password="guess")
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect username or password"}
    assert response.headers.get("www-authenticate") == "Bearer"


def test_unknown_user_gets_the_same_answer():
    """Неіснуючий логін — та сама відповідь, що й для неправильного пароля."""
    response = login(username="nobody")
    assert response.status_code == 401
    assert response.json() == {"detail": "Incorrect username or password"}


def test_me_with_token():
    """GET /me з токеном з /token — username і full_name."""
    token = login().json()["access_token"]
    response = me(token)
    assert response.status_code == 200
    assert response.json() == {"username": "anna", "full_name": "Anna Koval"}


def test_me_for_another_user():
    """Токен Івана — дані Івана: користувач береться з sub."""
    token = login("ivan", "ivan-pass-456").json()["access_token"]
    assert me(token).json()["username"] == "ivan"


def test_me_without_token_is_401():
    """Без заголовка Authorization — 401 (OAuth2PasswordBearer)."""
    assert client.get("/me").status_code == 401


def test_expired_token_is_401():
    """Прострочений токен — 401 "Could not validate credentials", а не 500: лови jwt.InvalidTokenError."""
    assert_bad_credentials(me(token_for("anna", minutes=-1)))


def test_foreign_signature_is_401():
    """Токен, підписаний іншим ключем, — 401."""
    assert_bad_credentials(me(token_for("anna", key=OTHER_KEY)))


def test_garbage_token_is_401():
    """Зіпсований рядок замість JWT — 401."""
    assert_bad_credentials(me("not-a-jwt"))


def test_token_of_a_deleted_user_is_401():
    """Підпис правильний, але sub неіснуючого користувача — 401."""
    assert_bad_credentials(me(token_for("ghost")))
