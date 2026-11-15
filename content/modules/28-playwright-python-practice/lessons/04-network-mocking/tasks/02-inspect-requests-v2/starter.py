from playwright.sync_api import Page, expect


def test_a_server_error_on_save_is_shown(page: Page):
    page.route("**/lab/profile", lambda route: route.fulfill(status=500, json={"error": "Server error"}))
    page.goto("/playground/devtools")

    page.get_by_role("button", name="Save profile").click()

    expect(page.get_by_test_id("profile-message")).to_have_text("Could not save the profile")


# твій код тут: тіло Save profile за замовчуванням і без newsletter, параметр status у Load orders
