import pytest

from shop.models import Customer, Order, OrderItem, Product
from shop.reports import order_lines

pytestmark = pytest.mark.django_db

ORDERS = 30


@pytest.fixture
def small_shop():
    anna = Customer.objects.create(name="Anna")
    ivan = Customer.objects.create(name="Ivan")
    mouse = Product.objects.create(name="Wireless mouse")
    hdmi = Product.objects.create(name="HDMI cable")
    first = Order.objects.create(number="A-1", customer=anna)
    OrderItem.objects.create(order=first, product=mouse, quantity=1)
    OrderItem.objects.create(order=first, product=hdmi, quantity=2)
    Order.objects.create(number="A-2", customer=ivan)


@pytest.fixture
def big_shop():
    products = [Product.objects.create(name=f"Product {n:02}") for n in range(5)]
    for n in range(ORDERS):
        customer = Customer.objects.create(name=f"Customer {n:02}")
        order = Order.objects.create(number=f"B-{n:03}", customer=customer)
        for product in products[:3]:
            OrderItem.objects.create(order=order, product=product, quantity=n % 3 + 1)


def test_report_content(small_shop):
    """Результат не змінюється: номер, ім'я покупця, рядки за назвою товару; замовлення без рядків — порожній список."""
    assert order_lines() == [
        {"number": "A-1", "customer": "Anna", "items": ["HDMI cable x2", "Wireless mouse x1"]},
        {"number": "A-2", "customer": "Ivan", "items": []},
    ]


def test_report_order(big_shop):
    """Замовлення за номером, у кожному — 3 рядки."""
    report = order_lines()
    assert [row["number"] for row in report] == [f"B-{n:03}" for n in range(ORDERS)]
    assert all(len(row["items"]) == 3 for row in report)


def test_at_most_three_queries(big_shop, django_assert_max_num_queries):
    """30 замовлень × 3 рядки — не більше 3 запитів: select_related для покупця, prefetch_related для рядків і товарів."""
    with django_assert_max_num_queries(3):
        order_lines()
