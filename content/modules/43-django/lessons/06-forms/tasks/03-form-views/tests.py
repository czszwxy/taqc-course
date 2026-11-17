import pytest
from pytest_django.asserts import assertContains, assertRedirects, assertTemplateUsed

from shop.models import Product

pytestmark = pytest.mark.django_db

VALID = {"name": "Webcam", "sku": "cam-01", "price": "1999"}


def test_create_get_shows_empty_form(client):
    """GET /products/new/ — 200, шаблон product_form.html, незаповнена форма в context["form"]."""
    response = client.get("/products/new/")
    assert response.status_code == 200
    assertTemplateUsed(response, "shop/product_form.html")
    assert not response.context["form"].is_bound


def test_create_invalid_post_rerenders(client):
    """Невалідний POST — 200, та сама сторінка з помилками, у базі нічого."""
    response = client.post("/products/new/", {**VALID, "price": "0"})
    assert response.status_code == 200
    assert response.context["form"].errors["price"] == ["Price must be at least 1."]
    assertContains(response, 'value="Webcam"')
    assert Product.objects.count() == 0


def test_create_valid_post_redirects(client):
    """Валідний POST — зберегти і 302 на сторінку нового товару (PRG)."""
    response = client.post("/products/new/", VALID)
    product = Product.objects.get()
    assertRedirects(response, f"/products/{product.pk}/")
    assert product.sku == "CAM-01"


def test_create_success_message(client):
    """Після перенаправлення на сторінці товару — "Product Webcam created."."""
    response = client.post("/products/new/", VALID, follow=True)
    assertContains(response, '<p class="message">Product Webcam created.</p>', html=True)


def test_edit_get_prefilled(client):
    """GET /products/<pk>/edit/ — форма, заповнена товаром (instance)."""
    product = Product.objects.create(name="Webcam", sku="CAM-01", price=1999)
    response = client.get(f"/products/{product.pk}/edit/")
    assert response.status_code == 200
    assert response.context["form"].instance == product
    assertContains(response, 'value="CAM-01"')


def test_edit_valid_updates_and_redirects(client):
    """Валідний POST оновлює ЦЕЙ товар (не створює новий) і перенаправляє з повідомленням."""
    product = Product.objects.create(name="Webcam", sku="CAM-01", price=1999)
    response = client.post(f"/products/{product.pk}/edit/", {"name": "Webcam HD", "sku": "cam-01", "price": "2199"}, follow=True)
    assertRedirects(response, f"/products/{product.pk}/")
    product.refresh_from_db()
    assert (product.name, product.price, Product.objects.count()) == ("Webcam HD", 2199, 1)
    assertContains(response, '<p class="message">Product Webcam HD updated.</p>', html=True)


def test_edit_invalid_keeps_old_values(client):
    """Невалідний POST на редагування — 200 з помилкою, товар не змінено."""
    product = Product.objects.create(name="Webcam", sku="CAM-01", price=1999)
    response = client.post(f"/products/{product.pk}/edit/", {"name": "Webcam", "sku": "CAM-01", "price": "0"})
    assert response.status_code == 200
    product.refresh_from_db()
    assert product.price == 1999


def test_edit_missing_is_404(client):
    """Неіснуючий товар — 404."""
    assert client.get("/products/999/edit/").status_code == 404
