from django.urls import path

from . import views

urlpatterns = [
    path("health/", views.health, name="health"),
    path("orders/", views.order_list, name="order-list"),
    path("orders/<int:pk>/", views.order_detail, name="order-detail"),
    path("orders/number/<str:number>/", views.order_by_number, name="order-by-number"),
    path("categories/<slug:slug>/products/", views.category_products, name="category-products"),
    path("customers/<int:customer_id>/orders/<int:year>/", views.customer_orders, name="customer-orders"),
]
