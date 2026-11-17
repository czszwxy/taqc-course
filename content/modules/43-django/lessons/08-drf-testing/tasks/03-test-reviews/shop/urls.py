from django.http import HttpResponse
from django.urls import path

from . import views


def login_page(request):
    return HttpResponse("login page")


urlpatterns = [
    path("products/<int:pk>/reviews/", views.product_reviews, name="product-reviews"),
    path("reviews/<int:pk>/", views.review_detail, name="review-detail"),
    path("accounts/login/", login_page, name="login"),
]
