import pytest
from pytest_django.asserts import assertContains, assertNotContains, assertTemplateUsed

from shop.models import Product

pytestmark = pytest.mark.django_db


def add(name, slug, price, stock=5):
    return Product.objects.create(name=name, slug=slug, price=price, stock=stock)


@pytest.fixture
def five_products():
    add("HDMI cable", "hdmi-cable", 349)
    add("Laptop stand", "laptop-stand", 1299)
    add("USB-C cable", "usb-c-cable", 299)
    add("Webcam", "webcam", 1999, stock=0)
    add("Wireless mouse", "wireless-mouse", 899)


def test_extends_base(client, five_products):
    """Сторінка наслідує shop/base.html: використано обидва шаблони."""
    response = client.get("/products/")
    assertTemplateUsed(response, "shop/product_list.html")
    assertTemplateUsed(response, "shop/base.html")


def test_title_uses_block_super(client, five_products):
    """<title> — "Catalog · Gadget shop": свій текст + {{ block.super }}."""
    assertContains(client.get("/products/"), "<title>Catalog · Gadget shop</title>", html=True)


def test_heading_and_count(client, five_products):
    """<h1>Catalog</h1> і <p class="count">5 products</p> — кількість УСІХ товарів, не лише сторінки."""
    response = client.get("/products/")
    assertContains(response, "<h1>Catalog</h1>", html=True)
    assertContains(response, '<p class="count">5 products</p>', html=True)


def test_count_singular(client):
    """Один товар — "1 product" (pluralize)."""
    add("Webcam", "webcam", 1999)
    assertContains(client.get("/products/"), '<p class="count">1 product</p>', html=True)


def test_product_rows(client, five_products):
    """Рядок: посилання {% url 'product-detail' slug %}, назва, " — ціна UAH"."""
    response = client.get("/products/")
    assertContains(response, '<li><a href="/products/hdmi-cable/">HDMI cable</a> — 349 UAH</li>', html=True)
    assertContains(response, '<li><a href="/products/laptop-stand/">Laptop stand</a> — 1299 UAH</li>', html=True)


def test_out_of_stock_badge(client, five_products):
    """stock == 0 — <span class="badge">Out of stock</span> у кінці <li>; в інших товарів бейджа немає."""
    response = client.get("/products/")
    assertContains(response, '<li><a href="/products/webcam/">Webcam</a> — 1999 UAH <span class="badge">Out of stock</span></li>', html=True)
    assertContains(response, "Out of stock", count=1)


def test_next_link_on_first_page(client, five_products):
    """Є наступна сторінка — <a class="next" href="?page=2">Next</a>."""
    assertContains(client.get("/products/"), '<a class="next" href="?page=2">Next</a>', html=True)


def test_no_next_link_on_last_page(client, five_products):
    """На останній сторінці посилання Next немає; там — п'ятий товар."""
    response = client.get("/products/?page=2")
    assertNotContains(response, "Next")
    assertContains(response, '<li><a href="/products/wireless-mouse/">Wireless mouse</a> — 899 UAH</li>', html=True)


def test_empty_catalog(client):
    """Порожньо — <li>No products yet.</li> ({% empty %}) і "0 products"."""
    response = client.get("/products/")
    assertContains(response, "<li>No products yet.</li>", html=True)
    assertContains(response, '<p class="count">0 products</p>', html=True)


def test_names_are_escaped(client):
    """Назва з <script> показується як текст: автоекранування, без |safe."""
    add('<script>alert("hi")</script>', "evil", 1)
    response = client.get("/products/")
    assertContains(response, "&lt;script&gt;")
    assertNotContains(response, '<script>alert("hi")</script>')
