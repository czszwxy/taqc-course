import pytest
from pytest_django.asserts import assertContains, assertTemplateUsed

from shop.models import Category, Product

pytestmark = pytest.mark.django_db


@pytest.fixture
def catalog():
    mice = Category.objects.create(name="Mice", slug="mice")
    cables = Category.objects.create(name="Cables", slug="cables")
    for n in range(4):
        Product.objects.create(category=mice, name=f"Mouse {n}", slug=f"mouse-{n}", price=500 + n, status="active")
    for n in range(3):
        Product.objects.create(category=cables, name=f"Cable {n}", slug=f"cable-{n}", price=200 + n, status="active")
    Product.objects.create(category=mice, name="Prototype mouse", slug="prototype", price=999, status="draft")
    Product.objects.create(category=mice, name="Old mouse", slug="old-mouse", price=99, status="archived")


def listed(response):
    assert response.status_code == 200
    return [p.name for p in response.context["products"]]


def test_first_page(client, catalog):
    """Активні товари за назвою, по 5; у шаблоні — products; шаблон shop/product_list.html."""
    response = client.get("/products/")
    assert listed(response) == ["Cable 0", "Cable 1", "Cable 2", "Mouse 0", "Mouse 1"]
    assertTemplateUsed(response, "shop/product_list.html")


def test_second_page(client, catalog):
    """?page=2 — решта двох; page_obj.number == 2."""
    response = client.get("/products/?page=2")
    assert listed(response) == ["Mouse 2", "Mouse 3"]
    assert response.context["page_obj"].number == 2


def test_page_out_of_range_is_404(client, catalog):
    """Неіснуюча сторінка — 404 (так працює paginate_by)."""
    assert client.get("/products/?page=9").status_code == 404


def test_category_filter_and_context(client, catalog):
    """?category=cables — лише кабелі, у контексті category — об'єкт категорії; заголовок — її назва."""
    response = client.get("/products/?category=cables")
    assert listed(response) == ["Cable 0", "Cable 1", "Cable 2"]
    assert response.context["category"] == Category.objects.get(slug="cables")
    assertContains(response, "<h1>Cables</h1>", html=True)


def test_no_filter_category_is_none(client, catalog):
    """Без фільтра category у контексті — None (get_context_data з super())."""
    response = client.get("/products/")
    assert response.context["category"] is None
    assert "page_obj" in response.context


def test_unknown_category_is_empty(client, catalog):
    """Невідомий slug — порожній список (200)."""
    assert listed(client.get("/products/?category=toys")) == []


def test_detail(client, catalog):
    """/products/mouse-1/ — сторінка товару, у шаблоні product."""
    response = client.get("/products/mouse-1/")
    assert response.status_code == 200
    assert response.context["product"].name == "Mouse 1"
    assertTemplateUsed(response, "shop/product_detail.html")


@pytest.mark.parametrize("slug", ["prototype", "old-mouse", "missing"])
def test_detail_hides_inactive(client, catalog, slug):
    """Чернетка, архівний і неіснуючий — 404."""
    assert client.get(f"/products/{slug}/").status_code == 404
