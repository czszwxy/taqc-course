from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("products/", views.product_list, name="product-list"),
    path("products/<int:pk>/", views.product_detail, name="product-detail"),
]
