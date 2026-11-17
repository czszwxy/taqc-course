import json

from django.http import JsonResponse
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from .models import Product


def product_to_dict(product):
    return {"id": product.pk, "name": product.name, "sku": product.sku, "price": product.price}


def active_products():
    return Product.objects.filter(status=Product.Status.ACTIVE)


def list_products(request):
    products = active_products().order_by("name")
    query = request.GET.get("q")
    if query:
        products = products.filter(name__icontains=query)
    raw_price = request.GET.get("max_price")
    if raw_price is not None:
        try:
            limit = int(raw_price)
        except ValueError:
            return JsonResponse({"error": "max_price must be a whole number"}, status=400)
        products = products.filter(price__lte=limit)
    return JsonResponse([product_to_dict(p) for p in products], safe=False)


def validation_errors(data):
    errors = {}
    for field in ("name", "sku"):
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            errors[field] = "Must be a non-empty string"
    price = data.get("price")
    if type(price) is not int or price < 1:
        errors["price"] = "Must be a whole number of at least 1"
    return errors


def create_product(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    errors = validation_errors(data)
    if errors:
        return JsonResponse({"errors": errors}, status=400)
    if Product.objects.filter(sku=data["sku"]).exists():
        return JsonResponse({"error": "SKU already exists"}, status=409)
    product = Product.objects.create(name=data["name"], sku=data["sku"], price=data["price"], status=Product.Status.ACTIVE)
    response = JsonResponse(product_to_dict(product), status=201)
    response["Location"] = reverse("product-detail", args=[product.pk])
    return response


@csrf_exempt
@require_http_methods(["GET", "POST"])
def product_collection(request):
    if request.method == "GET":
        return list_products(request)
    return create_product(request)


@require_GET
def product_detail(request, pk):
    product = active_products().filter(pk=pk).first()
    if product is None:
        return JsonResponse({"error": "Product not found"}, status=404)
    return JsonResponse(product_to_dict(product))
