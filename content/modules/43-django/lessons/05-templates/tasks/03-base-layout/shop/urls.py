from django.http import HttpResponse
from django.urls import path
from django.views.generic import TemplateView


def placeholder(request):
    return HttpResponse("placeholder")


urlpatterns = [
    path("", TemplateView.as_view(template_name="shop/home.html"), name="home"),
    path("cart/", TemplateView.as_view(template_name="shop/cart.html"), name="cart"),
    path("accounts/login/", placeholder, name="login"),
    path("accounts/logout/", placeholder, name="logout"),
]
