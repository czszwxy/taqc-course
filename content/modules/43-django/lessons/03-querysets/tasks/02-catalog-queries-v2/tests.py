from datetime import date, datetime, timezone

import pytest

from shop.models import Customer, Order
from shop.queries import customers_without_orders, orders_between, paid_revenue, top_customers

pytestmark = pytest.mark.django_db


def at(day, hour=12):
    return datetime(2026, 5, day, hour, tzinfo=timezone.utc)


@pytest.fixture
def shop():
    anna = Customer.objects.create(email="anna@example.com", name="Anna")
    ivan = Customer.objects.create(email="ivan@example.com", name="Ivan")
    olena = Customer.objects.create(email="olena@example.com", name="Olena")
    Customer.objects.create(email="petro@example.com", name="Petro")
    Customer.objects.create(email="bohdan@example.com", name="Bohdan")
    rows = [
        (anna, "A-1", "paid", 1200, at(1)),
        (anna, "A-2", "shipped", 800, at(3)),
        (ivan, "A-3", "new", 2000, at(3, 18)),
        (ivan, "A-4", "cancelled", 9000, at(4)),
        (olena, "A-5", "paid", 2000, at(5)),
        (olena, "A-6", "cancelled", 500, at(6)),
    ]
    for customer, number, status, total, created in rows:
        Order.objects.create(customer=customer, number=number, status=status, total=total, created_at=created)


def numbers(orders):
    return [o.number for o in orders]


def test_orders_between_is_inclusive(shop):
    """Обидві дати включно: 3–5 травня — A-2, A-3 (18:00), A-4, A-5."""
    assert numbers(orders_between(date(2026, 5, 3), date(2026, 5, 5))) == ["A-2", "A-3", "A-4", "A-5"]


def test_orders_between_one_day(shop):
    """Один день: start == end."""
    assert numbers(orders_between(date(2026, 5, 1), date(2026, 5, 1))) == ["A-1"]


def test_paid_revenue(shop):
    """paid і shipped: 1200 + 800 + 2000."""
    assert paid_revenue() == 4000


def test_paid_revenue_without_orders():
    """Немає оплачених — 0, а не None (Coalesce або "or 0")."""
    assert paid_revenue() == 0


def test_top_customers(shop):
    """Без скасованих: Anna 2000, Ivan 2000, Olena 2000 → рівні суми за email; Ivan's cancelled 9000 не рахується."""
    assert top_customers() == [("anna@example.com", 2000), ("ivan@example.com", 2000), ("olena@example.com", 2000)]


def test_top_customers_limit(shop):
    """limit обмежує кількість."""
    assert top_customers(limit=1) == [("anna@example.com", 2000)]


def test_top_customers_skips_zero(shop):
    """Покупці без (не скасованих) замовлень не потрапляють у топ."""
    emails = [email for email, _ in top_customers(limit=10)]
    assert "petro@example.com" not in emails and "bohdan@example.com" not in emails


def test_top_customers_is_one_query(shop, django_assert_num_queries):
    """Топ — одним запитом (annotate), без циклу по покупцях."""
    with django_assert_num_queries(1):
        top_customers()


def test_customers_without_orders(shop):
    """Без жодного замовлення, за email."""
    assert [c.email for c in customers_without_orders()] == ["bohdan@example.com", "petro@example.com"]
