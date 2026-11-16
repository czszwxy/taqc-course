import pytest
import requests
from playwright.sync_api import Page, expect
from pydantic import BaseModel, ConfigDict

TIMEOUT = 5


class Product(BaseModel):
    """Contract of one product in GET /api/products."""

    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    name: str
    category: str
    price: int
    rating: float
    inStock: bool


class CatalogPage:
    """Page object of /playground/search."""

    URL = "/playground/search"

    def __init__(self, page: Page):
        self.page = page
        self.category = page.get_by_label("Category")
        self.sort = page.get_by_label("Sort by")
        self.in_stock_only = page.get_by_label("In stock only")
        self.result_count = page.get_by_test_id("result-count")
        self.cards = page.get_by_test_id("results").get_by_role("listitem")
        self.names = page.get_by_test_id("product-name")
        self.prices = page.get_by_test_id("product-price")

    def open(self):
        self.page.goto(self.URL)
        return self


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


@pytest.fixture
def catalog(page: Page):
    return CatalogPage(page).open()


def test_product_by_id(api):
    response = requests.get(f"{api}/products/1", timeout=TIMEOUT)

    assert response.status_code == 200
    product = Product.model_validate(response.json())
    assert (product.name, product.price) == ("Wireless Mouse M2", 499)


def test_laptops_category(catalog):
    catalog.category.select_option("Laptops")

    expect(catalog.result_count).to_have_text("3 products found")
    expect(catalog.cards).to_have_count(3)


# твій код тут: контракт усіх товарів, параметризовані категорії, сторінки, limit=51,
# сортування за спаданням ціни, In stock only, неактивна кнопка для товару не в наявності
