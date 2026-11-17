from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ProductForm
from .models import Product


def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)
    return render(request, "shop/product_detail.html", {"product": product})


def product_create(request):
    form = ProductForm(request.POST or None)
    if form.is_valid():
        form.save()
    return render(request, "shop/product_form.html", {"form": form})


def product_edit(request, pk):
    # твій код тут
    pass
