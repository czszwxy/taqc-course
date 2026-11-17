"""Дані для задачі (лише для читання)."""

PRODUCTS = [{"id": number, "name": f"Product {number}", "price": 100 * number} for number in range(1, 24)]
ORDERS = [{"id": 1000 + number, "total": 250 * number} for number in range(1, 13)]
