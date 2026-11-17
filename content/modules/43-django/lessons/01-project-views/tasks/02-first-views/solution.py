from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .catalog import PRODUCTS


@require_GET
def health(request):
    return JsonResponse({"status": "ok"})


@require_GET
def product_list(request):
    category = request.GET.get("category")
    found = [p for p in PRODUCTS if category is None or p["category"] == category]
    return JsonResponse(found, safe=False)


@require_GET
def product_detail(request, pk):
    product = next((p for p in PRODUCTS if p["id"] == pk), None)
    if product is None:
        return JsonResponse({"detail": "Product not found"}, status=404)
    return JsonResponse(product)
