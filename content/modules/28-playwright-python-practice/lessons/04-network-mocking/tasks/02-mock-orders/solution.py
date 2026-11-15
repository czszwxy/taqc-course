from playwright.sync_api import Page, expect

SERVER_ERROR = {"error": "Server error"}


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


def test_an_empty_list_shows_no_orders_yet(page: Page):
    page.route("**/api/orders", lambda route: route.fulfill(json={"items": []}))

    sign_in(page)

    expect(page.get_by_test_id("orders-empty")).to_have_text("No orders yet")


def test_a_server_error_shows_an_error_message(page: Page):
    page.route("**/api/orders", lambda route: route.fulfill(status=500, json=SERVER_ERROR))

    sign_in(page)

    expect(page.get_by_role("alert")).to_have_text("Could not load your orders.")
    expect(page.get_by_test_id("orders-empty")).to_have_count(0)


def test_try_again_loads_the_orders_after_an_error(page: Page):
    server = {"down": True}

    def orders(route):
        if server["down"]:
            route.fulfill(status=500, json=SERVER_ERROR)
        else:
            route.fulfill(json={"items": [{"id": 2002, "status": "created", "quantity": 1}]})

    page.route("**/api/orders", orders)
    sign_in(page)
    expect(page.get_by_role("alert")).to_have_text("Could not load your orders.")

    server["down"] = False
    page.get_by_role("button", name="Try again").click()

    expect(page.get_by_test_id("orders")).to_contain_text("Order #2002")


def test_the_real_request_carries_the_bearer_token(page: Page):
    with page.expect_request("**/api/orders") as request_info:
        sign_in(page)
    request = request_info.value

    assert request.method == "GET"
    assert request.headers["authorization"].startswith("Bearer ")
