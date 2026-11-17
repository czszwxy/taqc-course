"""Views магазину (лише для читання)."""

from django.views.generic import DetailView, ListView

from .models import Product


class ProductListView(ListView):
    model = Product
    template_name = "shop/product_list.html"
    context_object_name = "products"
    paginate_by = 4


class ProductDetailView(DetailView):
    model = Product
    template_name = "shop/base.html"
