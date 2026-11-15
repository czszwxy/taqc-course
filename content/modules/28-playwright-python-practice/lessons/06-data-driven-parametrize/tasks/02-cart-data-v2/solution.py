import pytest
from playwright.sync_api import Page, expect

QUANTITY_ERROR = "Quantity must be from 1 to 10"


@pytest.mark.parametrize(
    ("quantity", "line_total"),
    [("1", "500 UAH"), ("10", "5,000 UAH")],
    ids=["min", "max"],
)
def test_valid_quantity_updates_the_line_total(page: Page, quantity, line_total):
    page.goto("/playground/cart")

    page.get_by_label("Quantity of Wireless mouse M2").fill(quantity)

    expect(page.get_by_test_id("line-total-mouse")).to_have_text(line_total)
    expect(page.get_by_role("alert")).to_have_count(0)


@pytest.mark.parametrize("quantity", ["0", "11"], ids=["below-min", "above-max"])
def test_invalid_quantity_is_rejected(page: Page, quantity):
    page.goto("/playground/cart")

    page.get_by_label("Quantity of Wireless mouse M2").fill(quantity)

    expect(page.get_by_role("alert")).to_have_text(QUANTITY_ERROR)
    expect(page.get_by_test_id("subtotal")).to_have_text("2,500 UAH")


@pytest.mark.parametrize("code", ["SAVE10", "save10", "  Save10  "], ids=["upper", "lower", "mixed-with-spaces"])
def test_save10_works_in_any_case(page: Page, code):
    page.goto("/playground/cart")

    page.get_by_label("Promo code").fill(code)
    page.get_by_role("button", name="Apply").click()

    expect(page.get_by_test_id("discount")).to_contain_text("250 UAH")
    expect(page.get_by_test_id("total")).to_have_text("2,350 UAH")
