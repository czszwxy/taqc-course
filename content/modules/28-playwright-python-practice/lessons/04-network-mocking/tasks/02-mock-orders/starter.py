from playwright.sync_api import Page, expect


def sign_in(page: Page):
    page.goto("/playground/account")
    page.get_by_label("Email").fill("qa@gadgetly.test")
    page.get_by_label("Password").fill("Test1234")
    page.get_by_role("button", name="Sign in").click()
    expect(page.get_by_role("heading", name="My account")).to_be_visible()


def test_shows_the_orders_from_the_api(page: Page):
    page.route("**/api/orders", lambda route: route.fulfill(json={"items": [{"id": 2001, "status": "paid", "quantity": 3}]}))

    sign_in(page)

    expect(page.get_by_test_id("orders")).to_contain_text("Order #2001")
    expect(page.get_by_test_id("orders")).to_contain_text("3 pcs · paid")


# твій код тут: порожній список, помилка 500, Try again після помилки, заголовок Authorization
