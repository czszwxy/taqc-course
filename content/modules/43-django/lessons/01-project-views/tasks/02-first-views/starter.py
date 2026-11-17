from django.http import JsonResponse
from django.views.decorators.http import require_GET

from .catalog import PRODUCTS


def health(request):
    return {"status": "ok"}


def product_list(request):
    # твій код тут
    pass


def product_detail(request, pk):
    # твій код тут
    pass
