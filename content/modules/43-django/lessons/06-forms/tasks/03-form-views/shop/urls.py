from django.urls import path

from . import views

urlpatterns = [
    path("products/new/", views.product_create, name="product-create"),
    path("products/<int:pk>/", views.product_detail, name="product-detail"),
    path("products/<int:pk>/edit/", views.product_edit, name="product-edit"),
]
