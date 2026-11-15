import pytest
from playwright.sync_api import Page, expect


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


# твій код тут: невалідні кількості (0, 11) і промокоди (SAVE10, save10, "  Save10  ")
