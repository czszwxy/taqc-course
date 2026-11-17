from django.urls import path

from . import api

urlpatterns = [
    path("api/products/", api.ProductListCreateView.as_view(), name="api-product-list"),
    path("api/products/<int:pk>/", api.ProductDetailView.as_view(), name="api-product-detail"),
]
