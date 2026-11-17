from django.db.models import Prefetch

from .models import Order, OrderItem


def order_lines():
    report = []
    for order in Order.objects.order_by("number"):
        items = order.items.order_by("product__name")
        report.append({
            "number": order.number,
            "customer": order.customer.name,
            "items": [f"{item.product.name} x{item.quantity}" for item in items],
        })
    return report
