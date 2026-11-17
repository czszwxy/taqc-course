"""Видані токени і дані для задачі (лише для читання). Справжні токени — довгі випадкові рядки."""

TOKENS = {
    "tok-anna-7c41f0": {"username": "anna", "role": "customer"},
    "tok-olga-91b2d8": {"username": "olga", "role": "support"},
    "tok-max-e05a3c": {"username": "max", "role": "admin"},
}

ORDERS = [
    {"id": 1001, "customer": "anna", "total": 1198},
    {"id": 1002, "customer": "ivan", "total": 299},
]

TICKETS = [
    {"id": 1, "title": "Refund for order 1002", "status": "open"},
    {"id": 2, "title": "Wrong colour delivered", "status": "closed"},
]
