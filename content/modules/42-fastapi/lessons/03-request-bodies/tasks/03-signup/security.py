"""Хешування паролів для задачі (лише для читання).

Навчальна версія: SHA-256 з «сіллю» застосунку. Справжні застосунки беруть повільні алгоритми (argon2, bcrypt).
"""

import hashlib

APP_SALT = "gadget-shop-demo-salt"


def hash_password(password: str) -> str:
    return hashlib.sha256(f"{APP_SALT}:{password}".encode()).hexdigest()
