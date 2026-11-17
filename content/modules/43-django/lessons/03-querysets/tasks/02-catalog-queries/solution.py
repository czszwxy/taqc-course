from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce

from .models import Category, Product

ACTIVE = Q(status=Product.Status.ACTIVE)


def active_products(max_price=None):
    products = Product.objects.filter(ACTIVE)
    if max_price is not None:
        products = products.filter(price__lte=max_price)
    return products.order_by("price", "name")


def search(text):
    return Product.objects.filter(ACTIVE).filter(Q(name__icontains=text) | Q(sku__iexact=text)).order_by("name")


def needs_restock():
    return Product.objects.filter(ACTIVE, stock__lt=F("reorder_level")).order_by("stock", "name")


def category_summary():
    active = Q(products__status=Product.Status.ACTIVE)
    categories = Category.objects.annotate(
        active_count=Count("products", filter=active),
        active_stock=Coalesce(Sum("products__stock", filter=active), 0),
    ).order_by("name")
    return [{"category": c.name, "products": c.active_count, "stock": c.active_stock} for c in categories]
