import json

import pytest

from shop.models import Product, Review

pytestmark = pytest.mark.django_db


@pytest.fixture
def mouse():
    return Product.objects.create(name="Wireless mouse", status="active")


@pytest.fixture
def draft():
    return Product.objects.create(name="Prototype", status="draft")


@pytest.fixture
def anna(django_user_model):
    return django_user_model.objects.create_user("anna", password="pw-123456")


@pytest.fixture
def ivan(django_user_model):
    return django_user_model.objects.create_user("ivan", password="pw-123456")


def post_review(client, product, **body):
    return client.post(f"/products/{product.pk}/reviews/", data=json.dumps(body), content_type="application/json")


def test_member_posts_a_review(client, mouse, anna):
    client.force_login(anna)
    response = post_review(client, mouse, rating=5, text="Great")
    assert response.status_code == 201
    assert response.json()["user"] == "anna"


def test_guest_cannot_post(client, mouse):
    response = post_review(client, mouse, rating=5)
    assert response.status_code == 302
    assert Review.objects.count() == 0


@pytest.mark.parametrize(("rating", "expected"), [(0, 400), (1, 201), (5, 201), (6, 400)])
def test_rating_bounds(client, mouse, anna, rating, expected):
    client.force_login(anna)
    assert post_review(client, mouse, rating=rating).status_code == expected


def test_second_review_is_409(client, mouse, anna):
    client.force_login(anna)
    post_review(client, mouse, rating=4)
    assert post_review(client, mouse, rating=5).status_code == 409
    assert Review.objects.count() == 1


def test_average_and_order(client, mouse, anna, ivan):
    Review.objects.create(product=mouse, user=anna, rating=5, text="first")
    Review.objects.create(product=mouse, user=ivan, rating=4, text="second")
    body = client.get(f"/products/{mouse.pk}/reviews/").json()
    assert body["average"] == 4.5
    assert [r["text"] for r in body["reviews"]] == ["second", "first"]


def test_no_reviews_average_is_null(client, mouse):
    assert client.get(f"/products/{mouse.pk}/reviews/").json() == {"average": None, "reviews": []}


def test_draft_has_no_reviews(client, draft, anna):
    client.force_login(anna)
    assert client.get(f"/products/{draft.pk}/reviews/").status_code == 404
    assert post_review(client, draft, rating=5).status_code == 404


def test_author_deletes(client, mouse, anna):
    review = Review.objects.create(product=mouse, user=anna, rating=3)
    client.force_login(anna)
    assert client.delete(f"/reviews/{review.pk}/").status_code == 204
    assert Review.objects.count() == 0


def test_other_user_cannot_delete(client, mouse, anna, ivan):
    review = Review.objects.create(product=mouse, user=anna, rating=3)
    client.force_login(ivan)
    assert client.delete(f"/reviews/{review.pk}/").status_code == 404
    assert Review.objects.filter(pk=review.pk).exists()
