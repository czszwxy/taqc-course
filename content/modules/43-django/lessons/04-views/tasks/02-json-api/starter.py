import json

from django.http import JsonResponse
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Product


def product_to_dict(product):
    return {"id": product.pk, "name": product.name, "sku": product.sku, "price": product.price}


def product_collection(request):
    products = Product.objects.all()
    return JsonResponse([product_to_dict(p) for p in products], safe=False)


def product_detail(request, pk):
    # твій код тут
    pass
