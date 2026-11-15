from playwright.sync_api import Page, expect


def test_locked_account_cannot_sign_in(page: Page):
    page.goto("/playground/login")

    page.get_by_label("Email").fill("locked@taskly.test")
    page.get_by_label("Password").fill("Locked123")
    page.get_by_role("button", name="Log in").click()

    expect(page.get_by_role("alert")).to_have_text("Your account is locked. Contact support.")


def test_forgot_password_needs_an_email(page: Page):
    page.goto("/playground/login")

    page.get_by_role("button", name="Forgot password?").click()

    expect(page.get_by_role("alert")).to_have_text("Email is required")


def test_wrong_password_is_rejected(page: Page):
    page.goto("/playground/login")

    page.get_by_label("Email").fill("demo@taskly.test")
    page.get_by_label("Password", exact=True).fill("wrong-pass")
    page.get_by_role("button", name="Login").click()

    expect(page.get_by_role("alert")).to_have_text("Invalid email or password")
