import pytest
from django.db import IntegrityError, models, transaction
from django.db.models import ProtectedError

from shop.models import Order, OrderItem, Product

pytestmark = pytest.mark.django_db


@pytest.fixture
def mouse():
    return Product.objects.create(name="Wireless mouse", price=899)


@pytest.fixture
def cable():
    return Product.objects.create(name="USB-C cable", price=299)


@pytest.fixture
def order():
    return Order.objects.create(number="A-1001", customer_email="anna@example.com")


def test_order_fields():
    """number — до 12 символів і унікальний, customer_email — EmailField."""
    number = Order._meta.get_field("number")
    assert (number.max_length, number.unique) == (12, True)
    assert isinstance(Order._meta.get_field("customer_email"), models.EmailField)


def test_order_defaults(order):
    """status за замовчуванням new, created_at — сам."""
    assert order.status == Order.Status.NEW == "new"
    assert order.created_at is not None


def test_status_choices():
    """Order.Status — new, paid, shipped, cancelled."""
    assert [value for value, _ in Order.Status.choices] == ["new", "paid", "shipped", "cancelled"]


def test_number_is_unique(order):
    """Той самий number — IntegrityError."""
    with pytest.raises(IntegrityError), transaction.atomic():
        Order.objects.create(number="A-1001", customer_email="ivan@example.com")


def test_newest_first(order):
    """Порядок за замовчуванням — новіші спершу (-id)."""
    newer = Order.objects.create(number="A-1002", customer_email="ivan@example.com")
    assert list(Order.objects.all()) == [newer, order]


def test_str(order):
    """str(order) — "Order A-1001"."""
    assert str(order) == "Order A-1001"


def test_items_and_total(order, mouse, cable):
    """order.items — рядки; line_total = quantity * unit_price; total() — їхня сума."""
    OrderItem.objects.create(order=order, product=mouse, quantity=2, unit_price=899)
    OrderItem.objects.create(order=order, product=cable, unit_price=299)
    assert order.items.count() == 2
    assert sorted(item.line_total for item in order.items.all()) == [299, 1798]
    assert order.total() == 2097


def test_empty_total(order):
    """Замовлення без рядків — total() == 0."""
    assert order.total() == 0


def test_quantity_default_and_minimum(order, mouse):
    """quantity за замовчуванням 1; 0 — IntegrityError (orderitem_quantity_positive)."""
    assert OrderItem.objects.create(order=order, product=mouse, unit_price=899).quantity == 1
    with pytest.raises(IntegrityError), transaction.atomic():
        OrderItem.objects.create(order=Order.objects.create(number="A-2", customer_email="x@example.com"), product=mouse, quantity=0, unit_price=899)


def test_one_line_per_product(order, mouse):
    """Той самий товар двічі в одному замовленні — IntegrityError (unique_product_per_order)."""
    OrderItem.objects.create(order=order, product=mouse, unit_price=899)
    with pytest.raises(IntegrityError), transaction.atomic():
        OrderItem.objects.create(order=order, product=mouse, unit_price=899)


def test_items_are_deleted_with_the_order(order, mouse):
    """Видалили замовлення — рядки видалились теж (CASCADE)."""
    OrderItem.objects.create(order=order, product=mouse, unit_price=899)
    order.delete()
    assert OrderItem.objects.count() == 0


def test_sold_product_is_protected(order, mouse):
    """Товар з рядками замовлень видалити не можна (PROTECT); зворотний доступ — product.order_items."""
    OrderItem.objects.create(order=order, product=mouse, unit_price=899)
    assert mouse.order_items.count() == 1
    with pytest.raises(ProtectedError):
        mouse.delete()
