from django.db.models import Q, Sum
from django.db.models.functions import Coalesce

from .models import Customer, Order

EARNING = [Order.Status.PAID, Order.Status.SHIPPED]


def orders_between(start, end):
    return Order.objects.filter(created_at__date__range=(start, end)).order_by("created_at")


def paid_revenue():
    return Order.objects.filter(status__in=EARNING).aggregate(revenue=Coalesce(Sum("total"), 0))["revenue"]


def top_customers(limit=3):
    not_cancelled = ~Q(orders__status=Order.Status.CANCELLED)
    customers = (
        Customer.objects.annotate(revenue=Coalesce(Sum("orders__total", filter=not_cancelled), 0))
        .filter(revenue__gt=0)
        .order_by("-revenue", "email")[:limit]
    )
    return [(c.email, c.revenue) for c in customers]


def customers_without_orders():
    return Customer.objects.filter(orders__isnull=True).order_by("email")
