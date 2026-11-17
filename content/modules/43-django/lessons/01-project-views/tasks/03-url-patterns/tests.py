import pytest
from django.urls import reverse


@pytest.mark.parametrize(
    ("name", "kwargs", "url"),
    [
        ("health", {}, "/health/"),
        ("order-list", {}, "/orders/"),
        ("order-detail", {"pk": 7}, "/orders/7/"),
        ("order-by-number", {"number": "A-1001"}, "/orders/number/A-1001/"),
        ("category-products", {"slug": "usb-cables"}, "/categories/usb-cables/products/"),
        ("customer-orders", {"customer_id": 42, "year": 2026}, "/customers/42/orders/2026/"),
    ],
)
def test_reverse(name, kwargs, url):
    """Кожне ім'я маршруту має reverse()-итись у свій шлях — перевір name=... і шаблон шляху."""
    assert reverse(name, kwargs=kwargs) == url


def test_order_detail_gets_an_int(client):
    """/orders/7/ — order_detail з pk=7 як ЧИСЛОМ (<int:pk>)."""
    assert client.get("/orders/7/").json() == {"view": "order_detail", "pk": 7}


def test_order_detail_rejects_text(client):
    """/orders/abc/ — 404: <int:pk> не пропускає текст."""
    assert client.get("/orders/abc/").status_code == 404


def test_order_by_number(client):
    """/orders/number/A-1001/ — order_by_number з рядком number."""
    assert client.get("/orders/number/A-1001/").json() == {"view": "order_by_number", "number": "A-1001"}


def test_category_products(client):
    """/categories/usb-cables/products/ — category_products зі slug."""
    assert client.get("/categories/usb-cables/products/").json() == {"view": "category_products", "slug": "usb-cables"}


def test_slug_rejects_spaces(client):
    """Пробіл у slug — 404: <slug:slug> пропускає лише латиницю, цифри, - і _."""
    assert client.get("/categories/usb cables/products/").status_code == 404


def test_customer_orders(client):
    """Два цілі аргументи: customer_id і year."""
    assert client.get("/customers/42/orders/2026/").json() == {"view": "customer_orders", "customer_id": 42, "year": 2026}


def test_order_list(client):
    """/orders/ — order_list."""
    assert client.get("/orders/").json() == {"view": "order_list"}


def test_missing_slash_redirects(client):
    """/orders без слеша — 301 на /orders/ (APPEND_SLASH): шляхи мають закінчуватися на /."""
    response = client.get("/orders")
    assert response.status_code == 301
    assert response["Location"] == "/orders/"
