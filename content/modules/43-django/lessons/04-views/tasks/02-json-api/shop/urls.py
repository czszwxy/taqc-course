from django.urls import path

from . import views

urlpatterns = [
    path("api/products/", views.product_collection, name="product-collection"),
    path("api/products/<int:pk>/", views.product_detail, name="product-detail"),
]
