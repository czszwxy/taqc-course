import pytest

from solution import Cart


def test_empty_cart():
    cart = Cart()
    assert cart.total() == 0
    assert cart.count() == 0


def test_add_and_total():
    cart = Cart()
    cart.add("Mouse", 450, 2)
    cart.add("Cable", 150)
    assert cart.total() == 1050
    assert cart.count() == 3


def test_same_item_increases_qty():
    """Той самий товар — збільшити кількість, а не перезаписати."""
    cart = Cart()
    cart.add("Mouse", 450)
    cart.add("Mouse", 450, 2)
    assert cart.count() == 3
    assert cart.total() == 1350


def test_remove():
    cart = Cart()
    cart.add("Mouse", 450)
    cart.add("Cable", 150)
    cart.remove("Cable")
    assert cart.total() == 450


def test_remove_missing():
    """Видалення відсутнього товару — KeyError (del self.items[name])."""
    with pytest.raises(KeyError):
        Cart().remove("Ghost")


def test_carts_are_independent():
    """Створюй self.items у __init__, а не в тілі класу."""
    a = Cart()
    a.add("Mouse", 450)
    assert Cart().total() == 0
