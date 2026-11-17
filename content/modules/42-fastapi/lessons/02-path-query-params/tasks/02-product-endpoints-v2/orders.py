"""Замовлення магазину (дані для задачі, лише для читання). total — у гривнях."""

from enum import StrEnum


class OrderStatus(StrEnum):
    new = "new"
    paid = "paid"
    shipped = "shipped"
    cancelled = "cancelled"


ORDERS = [
    {"id": 1001, "customer": "anna@shop.test", "status": "paid", "total": 1198},
    {"id": 1002, "customer": "ivan@shop.test", "status": "new", "total": 299},
    {"id": 1003, "customer": "anna@shop.test", "status": "shipped", "total": 8999},
    {"id": 1004, "customer": "olena@shop.test", "status": "cancelled", "total": 3499},
    {"id": 1005, "customer": "petro@shop.test", "status": "paid", "total": 648},
    {"id": 1006, "customer": "ivan@shop.test", "status": "paid", "total": 2499},
    {"id": 1007, "customer": "olena@shop.test", "status": "new", "total": 1599},
    {"id": 1008, "customer": "anna@shop.test", "status": "paid", "total": 1000},
    {"id": 1009, "customer": "maria@shop.test", "status": "shipped", "total": 749},
    {"id": 1010, "customer": "petro@shop.test", "status": "paid", "total": 3999},
]
