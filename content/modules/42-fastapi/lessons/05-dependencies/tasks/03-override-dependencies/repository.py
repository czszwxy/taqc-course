"""Сховище товарів (лише для читання). REPOSITORY — «бойовий» екземпляр застосунку."""

from datetime import date

SEED = [
    {"id": 1, "name": "USB-C cable", "price": 299, "added": date(2025, 11, 3)},
    {"id": 2, "name": "Wireless mouse", "price": 899, "added": date(2026, 2, 14)},
]


class ProductRepository:
    def __init__(self, products: list[dict] | None = None):
        self._products = {p["id"]: dict(p) for p in (SEED if products is None else products)}

    def all(self) -> list[dict]:
        return sorted(self._products.values(), key=lambda p: p["id"])

    def get(self, product_id: int) -> dict | None:
        return self._products.get(product_id)

    def add(self, name: str, price: int, added: date) -> dict:
        new_id = max(self._products, default=0) + 1
        self._products[new_id] = {"id": new_id, "name": name, "price": price, "added": added}
        return self._products[new_id]


REPOSITORY = ProductRepository()
