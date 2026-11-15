from playwright.sync_api import Page, expect


def apply_promo(page: Page, code: str):
    page.get_by_label("Promo code").fill(code)
    page.get_by_role("button", name="Apply").click()


def test_initial_totals(page: Page):
    page.goto("/playground/cart")

    expect.soft(page.get_by_test_id("subtotal")).to_have_text("2,500 UAH")
    expect.soft(page.get_by_test_id("shipping")).to_have_text("100 UAH")
    expect.soft(page.get_by_test_id("total")).to_have_text("2,600 UAH")


def test_shipping_is_free_from_exactly_3000(page: Page):
    page.goto("/playground/cart")

    page.get_by_label("Quantity of USB-C cable 1 m").fill("4")

    expect.soft(page.get_by_test_id("subtotal")).to_have_text("3,000 UAH")
    expect.soft(page.get_by_test_id("shipping")).to_have_text("Free")
    expect.soft(page.get_by_test_id("total")).to_have_text("3,000 UAH")


def test_save10_twice_does_not_stack(page: Page):
    page.goto("/playground/cart")

    apply_promo(page, "SAVE10")
    page.get_by_role("button", name="Apply").click()

    expect.soft(page.get_by_test_id("discount")).to_contain_text("250 UAH")
    expect.soft(page.get_by_test_id("total")).to_have_text("2,350 UAH")


def test_remove_deletes_exactly_that_item(page: Page):
    page.goto("/playground/cart")

    page.get_by_test_id("cart-item-keyboard").get_by_role("button", name="Remove").click()

    expect(page.get_by_test_id("cart-item-keyboard")).to_have_count(0)
    expect(page.get_by_test_id("cart-item-mouse")).to_be_visible()
    expect(page.get_by_test_id("cart-item-cable")).to_be_visible()
    expect(page.get_by_test_id("subtotal")).to_have_text("1,000 UAH")


def test_plus_member_keeps_free_shipping_with_save10(page: Page):
    page.goto("/playground/cart")

    page.get_by_label("Gadgetly Plus").check()
    apply_promo(page, "SAVE10")

    expect.soft(page.get_by_test_id("shipping")).to_have_text("Free")
    expect.soft(page.get_by_test_id("total")).to_have_text("2,250 UAH")
