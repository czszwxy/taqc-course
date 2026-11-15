from playwright.sync_api import Page, expect


def test_pay_moves_order_to_paid(page: Page):
    page.goto("/playground/order")
    history = page.get_by_test_id("order-history").get_by_role("listitem")

    page.get_by_role("button", name="Pay").click()

    expect(page.get_by_test_id("order-status")).to_have_text("Paid")
    expect(history).to_have_count(2)


def test_ship_is_not_allowed_before_pay(page: Page):
    page.goto("/playground/order")
    history = page.get_by_test_id("order-history").get_by_role("listitem")

    page.get_by_role("button", name="Ship").click()

    expect(page.get_by_role("alert")).to_have_text("Ship is not allowed for an order in status Created")
    expect(page.get_by_test_id("order-status")).to_have_text("Created")
    expect(history).to_have_count(1)


def test_cancelled_order_is_final(page: Page):
    page.goto("/playground/order")

    page.get_by_role("button", name="Cancel").click()
    page.get_by_role("button", name="Pay").click()

    expect(page.get_by_role("alert")).to_have_text("Pay is not allowed for an order in status Cancelled")
    expect(page.get_by_test_id("order-status")).to_have_text("Cancelled")


def test_cancelling_a_paid_order_issues_a_refund(page: Page):
    page.goto("/playground/order")

    page.get_by_role("button", name="Pay").click()
    page.get_by_role("button", name="Cancel").click()

    expect(page.get_by_test_id("order-status")).to_have_text("Cancelled")
    expect(page.get_by_test_id("history-note")).to_have_text("Refund of 2,749 UAH issued")
