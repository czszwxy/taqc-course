import pytest
from django.contrib import admin

from shop.models import Category, Product

pytestmark = pytest.mark.django_db

CHANGELIST = "/admin/shop/product/"


@pytest.fixture
def catalog():
    mice = Category.objects.create(name="Mice", slug="mice")
    cables = Category.objects.create(name="Cables", slug="cables")
    rows = [
        (mice, "Wireless mouse", "MOUSE-01", "active"),
        (mice, "Gaming mouse", "MOUSE-02", "draft"),
        (cables, "USB-C cable", "CABLE-C1", "active"),
    ]
    for category, name, sku, status in rows:
        Product.objects.create(category=category, name=name, slug=sku.lower(), sku=sku, price=500, status=status)


def product_admin():
    assert Product in admin.site._registry, "Product is not registered in the admin"
    return admin.site._registry[Product]


def test_both_models_registered():
    """Product і Category зареєстровані в адмінці."""
    assert Product in admin.site._registry and Category in admin.site._registry


def test_product_list_display():
    """Стовпці: name, sku, category, price, stock, status."""
    assert list(product_admin().list_display) == ["name", "sku", "category", "price", "stock", "status"]


def test_product_options():
    """Фільтри, пошук, slug з name, created_at лише для читання, порядок за name."""
    model_admin = product_admin()
    assert list(model_admin.list_filter) == ["status", "category"]
    assert set(model_admin.search_fields) == {"name", "sku"}
    assert list(model_admin.prepopulated_fields["slug"]) == ["name"]
    assert "created_at" in model_admin.readonly_fields
    assert list(model_admin.ordering) == ["name"]


def test_category_admin():
    """CategoryAdmin: стовпці name, slug; slug з name."""
    category_admin = admin.site._registry[Category]
    assert list(category_admin.list_display) == ["name", "slug"]
    assert list(category_admin.prepopulated_fields["slug"]) == ["name"]


def test_changelist_search(admin_client, catalog):
    """Пошук ?q=mouse знаходить обидві миші; ?q=cable-c1 — за sku."""
    assert admin_client.get(CHANGELIST, {"q": "mouse"}).context["cl"].result_count == 2
    assert admin_client.get(CHANGELIST, {"q": "cable-c1"}).context["cl"].result_count == 1


def test_changelist_filter(admin_client, catalog):
    """Фільтр за статусом: ?status__exact=active — два товари."""
    assert admin_client.get(CHANGELIST, {"status__exact": "active"}).context["cl"].result_count == 2


def test_archive_action(admin_client, catalog):
    """Дія archive: вибраним — status archived, повідомлення "2 products archived."; інших не чіпає."""
    ids = list(Product.objects.filter(category__slug="mice").values_list("pk", flat=True))
    response = admin_client.post(CHANGELIST, {"action": "archive", "_selected_action": ids}, follow=True)
    assert response.status_code == 200
    assert [str(m) for m in response.context["messages"]] == ["2 products archived."]
    assert set(Product.objects.filter(status="archived").values_list("sku", flat=True)) == {"MOUSE-01", "MOUSE-02"}
    assert Product.objects.get(sku="CABLE-C1").status == "active"


def test_action_description():
    """Підпис дії — "Archive selected products"."""
    archive = getattr(type(product_admin()), "archive", None)
    assert archive is not None, "ProductAdmin has no archive method"
    assert archive.short_description == "Archive selected products"


def test_created_at_is_readonly_on_the_form(admin_client, catalog):
    """На сторінці зміни товару created_at показано, але не як поле вводу."""
    product = Product.objects.get(sku="MOUSE-01")
    response = admin_client.get(f"/admin/shop/product/{product.pk}/change/")
    assert response.status_code == 200
    assert "created_at" not in response.context["adminform"].form.fields
