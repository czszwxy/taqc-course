import pytest
from django.db.models import QuerySet

from shop.models import Category, Product
from shop.queries import active_products, category_summary, needs_restock, search

pytestmark = pytest.mark.django_db

ACTIVE = Product.Status.ACTIVE


@pytest.fixture
def catalog():
    cables = Category.objects.create(name="Cables", slug="cables")
    mice = Category.objects.create(name="Mice", slug="mice")
    Category.objects.create(name="Audio", slug="audio")
    rows = [
        (mice, "Wireless mouse", "MOUSE-01", 899, 12, 5, ACTIVE),
        (mice, "Gaming mouse", "MOUSE-02", 1499, 2, 5, ACTIVE),
        (mice, "Mouse pad", "PAD-01", 199, 3, 3, ACTIVE),
        (mice, "Retro mouse", "MOUSE-03", 299, 0, 5, Product.Status.ARCHIVED),
        (cables, "USB-C cable", "CABLE-C1", 299, 40, 10, ACTIVE),
        (cables, "HDMI cable", "CABLE-H1", 349, 4, 10, ACTIVE),
        (cables, "Lightning cable", "CABLE-L1", 299, 1, 10, Product.Status.DRAFT),
    ]
    for category, name, sku, price, stock, reorder, status in rows:
        Product.objects.create(category=category, name=name, sku=sku, price=price, stock=stock, reorder_level=reorder, status=status)


def names(products):
    return [p.name for p in products]


def test_active_products_is_a_queryset(catalog):
    """Функції повертають QuerySet (лінивий), а не список."""
    assert isinstance(active_products(), QuerySet)
    assert isinstance(search("mouse"), QuerySet)
    assert isinstance(needs_restock(), QuerySet)


def test_active_products_order(catalog):
    """Лише активні; за ціною, при однаковій ціні — за назвою."""
    assert names(active_products()) == ["Mouse pad", "USB-C cable", "HDMI cable", "Wireless mouse", "Gaming mouse"]


def test_active_products_max_price(catalog):
    """max_price включно: price <= 299 (архівна Retro mouse за 299 — ні)."""
    assert names(active_products(max_price=299)) == ["Mouse pad", "USB-C cable"]


def test_search_by_name(catalog):
    """Назва містить text без урахування регістру; лише активні; за назвою."""
    assert names(search("MOUSE")) == ["Gaming mouse", "Mouse pad", "Wireless mouse"]


def test_search_by_sku(catalog):
    """Або sku дорівнює text без урахування регістру (Q(...) | Q(...))."""
    assert names(search("cable-c1")) == ["USB-C cable"]


def test_search_sku_is_exact(catalog):
    """sku — точний збіг (iexact), а не «містить»: "mouse-0" — частина двох sku, але не sku цілком."""
    assert names(search("mouse-0")) == []
    assert names(search("CABLE")) == ["HDMI cable", "USB-C cable"]


def test_needs_restock(catalog):
    """stock < власного reorder_level (F), лише активні; за stock, потім за назвою. Mouse pad: 3 == 3 — ні."""
    assert names(needs_restock()) == ["Gaming mouse", "HDMI cable"]


def test_category_summary(catalog):
    """Усі категорії за назвою; активні товари і сума їхнього stock; без активних — 0 і 0."""
    assert category_summary() == [
        {"category": "Audio", "products": 0, "stock": 0},
        {"category": "Cables", "products": 2, "stock": 44},
        {"category": "Mice", "products": 3, "stock": 17},
    ]


def test_category_summary_is_one_query(catalog, django_assert_num_queries):
    """Підсумок — ОДНИМ запитом (annotate), без циклу по категоріях."""
    with django_assert_num_queries(1):
        category_summary()
