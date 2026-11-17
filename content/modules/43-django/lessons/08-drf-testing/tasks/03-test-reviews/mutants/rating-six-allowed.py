"""Відгуки на товари — код, який ти тестуєш (лише для читання)."""

import json

from django.contrib.auth.decorators import login_required
from django.db.models import Avg
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Product, Review

MAX_RATING = 5
MAX_TEXT = 500


def review_to_dict(review):
    return {"id": review.pk, "user": review.user.username, "rating": review.rating, "text": review.text}


def list_reviews(product):
    reviews = product.reviews.select_related("user").order_by("-id")
    average = reviews.aggregate(avg=Avg("rating"))["avg"]
    return JsonResponse({
        "average": None if average is None else round(average, 1),
        "reviews": [review_to_dict(r) for r in reviews],
    })


@login_required
def add_review(request, product):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    rating = data.get("rating")
    text = data.get("text", "")
    if type(rating) is not int or not 1 <= rating or not isinstance(text, str) or len(text) > MAX_TEXT:
        return JsonResponse({"error": "Rating must be 1-5 and text at most 500 characters"}, status=400)
    if product.reviews.filter(user=request.user).exists():
        return JsonResponse({"error": "You have already reviewed this product"}, status=409)
    review = Review.objects.create(product=product, user=request.user, rating=rating, text=text)
    return JsonResponse(review_to_dict(review), status=201)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def product_reviews(request, pk):
    product = get_object_or_404(Product, pk=pk, status=Product.Status.ACTIVE)
    if request.method == "GET":
        return list_reviews(product)
    return add_review(request, product)


@csrf_exempt
@require_http_methods(["DELETE"])
@login_required
def review_detail(request, pk):
    if request.user.is_staff:
        review = get_object_or_404(Review, pk=pk)
    else:
        review = get_object_or_404(Review, pk=pk, user=request.user)
    review.delete()
    return HttpResponse(status=204)
