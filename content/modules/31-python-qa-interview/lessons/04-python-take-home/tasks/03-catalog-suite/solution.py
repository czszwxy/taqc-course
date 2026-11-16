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

    def card(self, product_id: str):
        return self.page.get_by_test_id(f"product-{product_id}")

    def add_to_cart(self, product_id: str):
        return self.card(product_id).get_by_role("button", name="Add to cart")

    def price_values(self) -> list[int]:
        return [int(text.replace(",", "").replace("UAH", "").strip()) for text in self.prices.all_inner_texts()]


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


@pytest.fixture
def catalog(page: Page):
    return CatalogPage(page).open()


def get_products(api, **params):
    response = requests.get(f"{api}/products", params=params, timeout=TIMEOUT)
    assert response.status_code == 200, response.text
    return response.json()


def test_product_by_id(api):
    response = requests.get(f"{api}/products/1", timeout=TIMEOUT)

    assert response.status_code == 200
    product = Product.model_validate(response.json())
    assert (product.name, product.price) == ("Wireless Mouse M2", 499)


def test_every_product_matches_the_contract(api):
    body = get_products(api, limit=50)

    assert body["total"] == 14
    for item in body["items"]:
        Product.model_validate(item)


@pytest.mark.parametrize(
    "category, expected",
    [("Accessories", 5), ("Laptops", 3), ("Phones", 3), ("Headphones", 3)],
    ids=["accessories", "laptops", "phones", "headphones"],
)
def test_category_filter(api, category, expected):
    body = get_products(api, category=category, limit=50)

    assert body["total"] == expected
    assert len(body["items"]) == expected
    assert all(item["category"] == category for item in body["items"])


def test_pages_do_not_overlap(api):
    first = {item["id"] for item in get_products(api, page=1, limit=5)["items"]}
    second = {item["id"] for item in get_products(api, page=2, limit=5)["items"]}

    assert len(first) == 5 and len(second) == 5
    assert first.isdisjoint(second), f"pages share ids {first & second}"


def test_limit_above_maximum_is_rejected(api):
    response = requests.get(f"{api}/products", params={"limit": 51}, timeout=TIMEOUT)

    assert response.status_code == 400, response.text


def test_laptops_category(catalog):
    catalog.category.select_option("Laptops")

    expect(catalog.result_count).to_have_text("3 products found")
    expect(catalog.cards).to_have_count(3)


def test_sort_by_price_high_to_low(catalog):
    catalog.sort.select_option(label="Price: high to low")

    expect(catalog.names.first).to_have_text("Laptop Pro 15")
    prices = catalog.price_values()
    assert prices == sorted(prices, reverse=True)


def test_in_stock_counter_matches_cards(catalog):
    catalog.in_stock_only.check()

    expect(catalog.cards).to_have_count(10)
    expect(catalog.result_count).to_have_text("10 products found")


def test_out_of_stock_product_cannot_be_added(catalog):
    expect(catalog.add_to_cart("p02")).to_be_disabled()
    expect(catalog.add_to_cart("p01")).to_be_enabled()
