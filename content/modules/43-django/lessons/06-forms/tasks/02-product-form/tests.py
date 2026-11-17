import pytest

from shop.forms import ProductForm
from shop.models import Product

pytestmark = pytest.mark.django_db


def form_with(**changes):
    data = {"name": "Webcam", "sku": "CAM-01", "price": "1999", "stock": "3"}
    return ProductForm(data={**data, **changes})


def errors_of(form):
    assert not form.is_valid()
    return form.errors


def test_valid_form_saves():
    """Валідні дані — is_valid() і save() створює товар."""
    form = form_with()
    assert form.is_valid(), form.errors
    product = form.save()
    assert (product.name, product.sku, product.price, product.stock) == ("Webcam", "CAM-01", 1999, 3)


def test_fields_whitelist():
    """Поля форми — рівно name, sku, price, compare_at_price, stock."""
    assert list(ProductForm().fields) == ["name", "sku", "price", "compare_at_price", "stock"]


def test_is_featured_cannot_be_set():
    """Дописане в запит is_featured ігнорується — його немає в fields."""
    form = form_with(is_featured="on")
    assert form.is_valid()
    assert form.save().is_featured is False


def test_name_is_stripped():
    """name без пробілів по краях."""
    form = form_with(name="  Webcam  ")
    assert form.is_valid()
    assert form.cleaned_data["name"] == "Webcam"


def test_name_too_short():
    """Після strip менше 2 символів — "Name is too short."."""
    assert errors_of(form_with(name=" X ")) == {"name": ["Name is too short."]}


def test_sku_normalized():
    """sku без пробілів і великими літерами: " cam-01 " → "CAM-01" (clean_sku повертає значення)."""
    form = form_with(sku=" cam-01 ")
    assert form.is_valid()
    assert form.cleaned_data["sku"] == "CAM-01"


@pytest.mark.parametrize("sku", ["AB", "CAM 01", "CAM_01", "КАМ-01"])
def test_sku_format(sku):
    """Лише латиниця, цифри й дефіс, щонайменше 3 символи."""
    assert errors_of(form_with(sku=sku))["sku"] == ["Use 3-20 letters, digits or dashes."]


def test_sku_too_long():
    """21 символ — помилка поля sku (тут спрацює ще max_length моделі)."""
    assert "sku" in errors_of(form_with(sku="A" * 21))


def test_sku_unique_after_normalizing():
    """Є "MOUSE-01" — "mouse-01" теж дубль: унікальність перевіряється по очищеному значенню."""
    Product.objects.create(name="Wireless mouse", sku="MOUSE-01", price=899)
    assert "sku" in errors_of(form_with(sku="mouse-01"))


def test_price_at_least_one():
    """price 0 — "Price must be at least 1.", 1 — можна."""
    assert errors_of(form_with(price="0"))["price"] == ["Price must be at least 1."]
    assert form_with(price="1").is_valid()


def test_compare_at_price_optional():
    """Без compare_at_price форма валідна."""
    assert form_with().is_valid()


@pytest.mark.parametrize("old_price", ["1999", "1500"])
def test_compare_at_price_must_be_higher(old_price):
    """Стара ціна <= ціни — помилка біля compare_at_price (add_error), а не загальна."""
    errors = errors_of(form_with(compare_at_price=old_price))
    assert errors == {"compare_at_price": ["Must be higher than the price."]}


def test_compare_at_price_higher_is_fine():
    """Стара ціна більша — валідно."""
    assert form_with(compare_at_price="2499").is_valid()


def test_editing_keeps_own_sku():
    """Редагування (instance=) того самого товару з тим самим sku — не дубль."""
    product = Product.objects.create(name="Webcam", sku="CAM-01", price=1999)
    form = ProductForm(data={"name": "Webcam HD", "sku": "cam-01", "price": "2199", "stock": "1"}, instance=product)
    assert form.is_valid(), form.errors
    form.save()
    product.refresh_from_db()
    assert (product.name, product.price) == ("Webcam HD", 2199)
