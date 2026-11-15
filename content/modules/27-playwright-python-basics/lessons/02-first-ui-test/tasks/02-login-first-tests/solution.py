from playwright.sync_api import Page, expect


def test_sign_in_form_is_shown(page: Page):
    page.goto("/playground/login")

    expect(page.get_by_role("heading", name="Sign in to Taskly")).to_be_visible()
    expect(page.get_by_label("Email")).to_be_visible()
    expect(page.get_by_label("Password", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Log in")).to_be_visible()


def test_demo_user_can_sign_in(page: Page):
    page.goto("/playground/login")

    page.get_by_label("Email").fill("demo@taskly.test")
    page.get_by_label("Password", exact=True).fill("Demo1234")
    page.get_by_role("button", name="Log in").click()

    expect(page.get_by_role("heading", name="Welcome back!")).to_be_visible()
    expect(page.get_by_test_id("signed-in-as")).to_have_text("Signed in as demo@taskly.test")


def test_wrong_password_shows_error(page: Page):
    page.goto("/playground/login")

    page.get_by_label("Email").fill("demo@taskly.test")
    page.get_by_label("Password", exact=True).fill("wrong-pass")
    page.get_by_role("button", name="Log in").click()

    expect(page.get_by_role("alert")).to_have_text("Invalid email or password")
    expect(page.get_by_role("heading", name="Welcome back!")).to_be_hidden()
