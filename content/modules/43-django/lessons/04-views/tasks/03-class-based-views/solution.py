from django.views.generic import DetailView, ListView

from .models import Category, Product


class ProductListView(ListView):
    template_name = "shop/product_list.html"
    context_object_name = "products"
    paginate_by = 5

    def category_slug(self):
        return self.request.GET.get("category")

    def get_queryset(self):
        products = Product.objects.filter(status=Product.Status.ACTIVE).order_by("name")
        slug = self.category_slug()
        return products.filter(category__slug=slug) if slug else products

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        slug = self.category_slug()
        context["category"] = Category.objects.filter(slug=slug).first() if slug else None
        return context


class ProductDetailView(DetailView):
    queryset = Product.objects.filter(status=Product.Status.ACTIVE)
    template_name = "shop/product_detail.html"
    context_object_name = "product"
