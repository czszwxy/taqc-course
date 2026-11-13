import dataclasses

from solution import Product, product_from_api


def test_is_dataclass():
    assert dataclasses.is_dataclass(Product)


def test_default_in_stock():
    """in_stock за замовчуванням True — поле зі значенням після обов'язкових."""
    assert Product(1, "Mouse", 450).in_stock is True


def test_equality_and_repr():
    mouse = Product(1, "Mouse", 450)
    assert mouse == Product(id=1, name="Mouse", price=450, in_stock=True)
    assert repr(mouse) == "Product(id=1, name='Mouse', price=450, in_stock=True)"


def test_discounted():
    """Округли до цілого: round(...)."""
    assert Product(1, "Mouse", 450).discounted(10) == 405
    assert Product(2, "Hub", 999).discounted(10) == 899


def test_from_api_ignores_extra_fields():
    data = {"id": 3, "name": "Cable", "price": 150, "created_at": "2026-11-12"}
    assert product_from_api(data) == Product(3, "Cable", 150)


def test_from_api_out_of_stock():
    assert product_from_api({"id": 4, "name": "Monitor", "price": 7500, "in_stock": False}).in_stock is False
