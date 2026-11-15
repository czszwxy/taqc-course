from playwright.sync_api import Page, expect


def test_initial_totals(page: Page):
    page.goto("/playground/cart")

    expect.soft(page.get_by_test_id("subtotal")).to_have_text("2,500 UAH")
    expect.soft(page.get_by_test_id("shipping")).to_have_text("100 UAH")
    expect.soft(page.get_by_test_id("total")).to_have_text("2,600 UAH")


# твій код тут: доставка рівно від 3,000, SAVE10 двічі, Remove у рядку клавіатури, Plus + SAVE10
