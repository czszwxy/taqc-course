from django.contrib.auth.decorators import login_required, permission_required
from django.db.models import Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404

from .models import Order


def order_to_dict(order):
    return {"number": order.number, "total": order.total, "status": order.status}


def my_orders(request):
    orders = Order.objects.order_by("number")
    return JsonResponse([order_to_dict(o) for o in orders], safe=False)


def order_detail(request, pk):
    # твій код тут
    pass


def sales_report(request):
    # твій код тут
    pass
