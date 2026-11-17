from django.http import HttpResponse
from django.urls import path

from . import views


def login_page(request):
    return HttpResponse("login page")


urlpatterns = [
    path("orders/", views.my_orders, name="my-orders"),
    path("orders/<int:pk>/", views.order_detail, name="order-detail"),
    path("reports/sales/", views.sales_report, name="sales-report"),
    path("accounts/login/", login_page, name="login"),
]
