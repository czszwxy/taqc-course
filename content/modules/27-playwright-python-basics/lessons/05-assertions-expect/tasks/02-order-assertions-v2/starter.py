from playwright.sync_api import Page, expect


def test_pay_moves_order_to_paid(page: Page):
    page.goto("/playground/order")
    history = page.get_by_test_id("order-history").get_by_role("listitem")

    page.get_by_role("button", name="Pay").click()

    expect(page.get_by_test_id("order-status")).to_have_text("Paid")
    expect(history).to_have_count(2)


# твій код тут: Ship до оплати, Pay після Cancel, повернення коштів після Pay → Cancel
