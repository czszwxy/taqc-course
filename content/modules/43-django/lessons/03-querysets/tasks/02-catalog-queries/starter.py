from django.db.models import Count, F, Q, Sum
from django.db.models.functions import Coalesce

from .models import Category, Product


def active_products(max_price=None):
    return Product.objects.all()


def search(text):
    # твій код тут
    pass


def needs_restock():
    # твій код тут
    pass


def category_summary():
    # твій код тут
    pass
