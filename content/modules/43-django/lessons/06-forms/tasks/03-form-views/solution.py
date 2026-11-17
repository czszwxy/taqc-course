from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render

from .forms import ProductForm
from .models import Product


def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)
    return render(request, "shop/product_detail.html", {"product": product})


def product_create(request):
    if request.method == "POST":
        form = ProductForm(request.POST)
        if form.is_valid():
            product = form.save()
            messages.success(request, f"Product {product.name} created.")
            return redirect("product-detail", pk=product.pk)
    else:
        form = ProductForm()
    return render(request, "shop/product_form.html", {"form": form})


def product_edit(request, pk):
    product = get_object_or_404(Product, pk=pk)
    form = ProductForm(request.POST or None, instance=product)
    if request.method == "POST" and form.is_valid():
        product = form.save()
        messages.success(request, f"Product {product.name} updated.")
        return redirect("product-detail", pk=product.pk)
    return render(request, "shop/product_form.html", {"form": form})
