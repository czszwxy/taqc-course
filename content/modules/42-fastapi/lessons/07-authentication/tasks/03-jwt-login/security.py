"""Безпека для задачі (лише для читання). У справжньому проєкті SECRET_KEY береться зі змінної середовища."""

import hashlib
import hmac

SECRET_KEY = "demo-only-0f6c2a9e8b7d41c3a5e2f9d8c7b6a5e4"
ALGORITHM = "HS256"
ACCESS_TOKEN_MINUTES = 15
ITERATIONS = 100_000


def hash_password(password: str, salt: str) -> str:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), ITERATIONS)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    salt, _ = password_hash.split("$")
    return hmac.compare_digest(hash_password(password, salt), password_hash)


USERS = {
    "anna": {"username": "anna", "full_name": "Anna Koval", "password_hash": hash_password("anna-pass-123", "a1b2c3d4")},
    "ivan": {"username": "ivan", "full_name": "Ivan Petrenko", "password_hash": hash_password("ivan-pass-456", "e5f6a7b8")},
}
