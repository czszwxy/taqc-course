from playwright.sync_api import Page, expect


def sign_in(page: Page, email: str, password: str = "Demo1234"):
    page.goto("/playground/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password", exact=True).fill(password)
    page.get_by_role("button", name="Log in").click()


def test_demo_user_can_sign_in(page: Page):
    sign_in(page, "demo@taskly.test")

    expect(page.get_by_role("heading", name="Welcome back!")).to_be_visible()
    expect(page.get_by_text("Signed in as demo@taskly.test")).to_be_visible()


def test_email_is_case_insensitive(page: Page):
    sign_in(page, "DEMO@Taskly.TEST")

    expect(page.get_by_role("heading", name="Welcome back!")).to_be_visible()


def test_spaces_around_email_are_ignored(page: Page):
    sign_in(page, "  demo@taskly.test  ")

    expect(page.get_by_role("heading", name="Welcome back!")).to_be_visible()


def test_email_is_not_remembered_without_remember_me(page: Page):
    sign_in(page, "demo@taskly.test")
    page.get_by_role("button", name="Log out").click()

    expect(page.get_by_label("Email")).to_have_value("")
