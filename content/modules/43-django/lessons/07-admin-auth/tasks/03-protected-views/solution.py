from django.contrib.auth.decorators import login_required, permission_required
from django.db.models import Sum
from django.http import JsonResponse
from django.shortcuts import get_object_or_404

from .models import Order

EARNING = [Order.Status.PAID, Order.Status.SHIPPED]


def order_to_dict(order):
    return {"number": order.number, "total": order.total, "status": order.status}


@login_required
def my_orders(request):
    orders = Order.objects.filter(customer=request.user).order_by("number")
    return JsonResponse([order_to_dict(o) for o in orders], safe=False)


@login_required
def order_detail(request, pk):
    if request.user.is_staff:
        order = get_object_or_404(Order, pk=pk)
    else:
        order = get_object_or_404(Order, pk=pk, customer=request.user)
    return JsonResponse(order_to_dict(order))


@login_required
@permission_required("shop.view_order", raise_exception=True)
def sales_report(request):
    revenue = Order.objects.filter(status__in=EARNING).aggregate(total=Sum("total"))["total"] or 0
    return JsonResponse({"orders": Order.objects.count(), "revenue": revenue})
