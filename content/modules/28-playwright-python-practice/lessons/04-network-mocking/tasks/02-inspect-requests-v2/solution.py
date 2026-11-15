from urllib.parse import parse_qs, urlparse

from playwright.sync_api import Page, expect


def is_profile_save(request):
    return "/lab/profile" in request.url and request.method == "POST"


def test_a_server_error_on_save_is_shown(page: Page):
    page.route("**/lab/profile", lambda route: route.fulfill(status=500, json={"error": "Server error"}))
    page.goto("/playground/devtools")

    page.get_by_role("button", name="Save profile").click()

    expect(page.get_by_test_id("profile-message")).to_have_text("Could not save the profile")


def test_save_profile_sends_the_form_data(page: Page):
    page.goto("/playground/devtools")

    with page.expect_request(is_profile_save) as request_info:
        page.get_by_role("button", name="Save profile").click()

    assert request_info.value.post_data_json == {"name": "Olena", "newsletter": True, "language": "uk"}


def test_unchecking_newsletter_sends_false(page: Page):
    page.goto("/playground/devtools")
    page.get_by_label("Subscribe to newsletter").uncheck()

    with page.expect_request(is_profile_save) as request_info:
        page.get_by_role("button", name="Save profile").click()

    assert request_info.value.post_data_json["newsletter"] is False


def test_load_orders_sends_the_selected_status(page: Page):
    page.goto("/playground/devtools")
    page.get_by_label("Status", exact=True).select_option("shipped")

    with page.expect_request("**/lab/orders*") as request_info:
        page.get_by_role("button", name="Load orders").click()

    assert parse_qs(urlparse(request_info.value.url).query)["status"] == ["shipped"]
