import pytest
from django.db import IntegrityError, models, transaction
from django.db.models import ProtectedError

from shop.models import Category, Product

pytestmark = pytest.mark.django_db


@pytest.fixture
def cables():
    return Category.objects.create(name="Cables", slug="cables")


def make_product(category, **fields):
    data = {"name": "Wireless mouse", "sku": "MOUSE-01", "price": 899}
    return Product.objects.create(category=category, **{**data, **fields})


def test_category_fields():
    """Category: name — CharField(max_length=50, unique=True), slug — SlugField(unique=True)."""
    name = Category._meta.get_field("name")
    slug = Category._meta.get_field("slug")
    assert (name.max_length, name.unique) == (50, True)
    assert isinstance(slug, models.SlugField) and slug.unique


def test_product_fields():
    """name до 100 символів, sku до 20 і унікальний, price і stock — PositiveIntegerField."""
    meta = Product._meta
    assert meta.get_field("name").max_length == 100
    assert (meta.get_field("sku").max_length, meta.get_field("sku").unique) == (20, True)
    assert isinstance(meta.get_field("price"), models.PositiveIntegerField)
    assert isinstance(meta.get_field("stock"), models.PositiveIntegerField)


def test_defaults(cables):
    """stock за замовчуванням 0, status — draft, created_at заповнюється сам."""
    product = make_product(cables)
    assert product.stock == 0
    assert product.status == Product.Status.DRAFT == "draft"
    assert product.created_at is not None


def test_status_choices():
    """Product.Status — TextChoices з draft, active, archived."""
    assert [value for value, _ in Product.Status.choices] == ["draft", "active", "archived"]


def test_sku_is_unique(cables):
    """Той самий sku вдруге — IntegrityError від бази (unique=True)."""
    make_product(cables)
    with pytest.raises(IntegrityError), transaction.atomic():
        make_product(cables, name="Another mouse")


def test_price_must_be_at_least_one(cables):
    """price = 0 — IntegrityError: CheckConstraint(condition=Q(price__gte=1)). PositiveIntegerField сам 0 пропускає."""
    with pytest.raises(IntegrityError), transaction.atomic():
        make_product(cables, price=0)
    assert make_product(cables, sku="CHEAP-1", price=1).price == 1


def test_constraint_name():
    """Обмеження має назву product_price_positive."""
    assert "product_price_positive" in [c.name for c in Product._meta.constraints]


def test_related_name(cables):
    """category.products — товари категорії (related_name="products")."""
    make_product(cables)
    make_product(cables, name="USB-C cable", sku="CABLE-C1", price=299)
    assert cables.products.count() == 2


def test_category_with_products_is_protected(cables):
    """Видалити категорію з товарами не можна: on_delete=PROTECT → ProtectedError."""
    make_product(cables)
    with pytest.raises(ProtectedError):
        cables.delete()


def test_empty_category_can_be_deleted(cables):
    """Порожню категорію видалити можна."""
    cables.delete()
    assert Category.objects.count() == 0


def test_ordering(cables):
    """Порядок за замовчуванням — за name (і для категорій теж)."""
    make_product(cables, name="Webcam", sku="CAM-1")
    make_product(cables, name="HDMI cable", sku="HDMI-1")
    Category.objects.create(name="Audio", slug="audio")
    assert [p.name for p in Product.objects.all()] == ["HDMI cable", "Webcam"]
    assert [c.name for c in Category.objects.all()] == ["Audio", "Cables"]


def test_str(cables):
    """str(product) — "назва (sku)", str(category) — назва."""
    assert str(make_product(cables)) == "Wireless mouse (MOUSE-01)"
    assert str(cables) == "Cables"
