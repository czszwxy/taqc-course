"""Views магазину (лише для читання): кожна відповідає, хто вона і що отримала."""

from django.http import JsonResponse


def health(request):
    return JsonResponse({"view": "health"})


def order_list(request):
    return JsonResponse({"view": "order_list"})


def order_detail(request, pk):
    return JsonResponse({"view": "order_detail", "pk": pk})


def order_by_number(request, number):
    return JsonResponse({"view": "order_by_number", "number": number})


def category_products(request, slug):
    return JsonResponse({"view": "category_products", "slug": slug})


def customer_orders(request, customer_id, year):
    return JsonResponse({"view": "customer_orders", "customer_id": customer_id, "year": year})
