from django.views.generic import DetailView, ListView

from .models import Category, Product


class ProductListView(ListView):
    model = Product
    template_name = "shop/product_list.html"


class ProductDetailView(DetailView):
    # твій код тут
    pass
