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


# твій код тут
