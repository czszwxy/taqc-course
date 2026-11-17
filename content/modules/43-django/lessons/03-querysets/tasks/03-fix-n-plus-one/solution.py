from django.db.models import Prefetch

from .models import Order, OrderItem


def order_lines():
    items = OrderItem.objects.select_related("product").order_by("product__name")
    orders = Order.objects.select_related("customer").prefetch_related(Prefetch("items", queryset=items)).order_by("number")
    return [
        {
            "number": order.number,
            "customer": order.customer.name,
            "items": [f"{item.product.name} x{item.quantity}" for item in order.items.all()],
        }
        for order in orders
    ]
