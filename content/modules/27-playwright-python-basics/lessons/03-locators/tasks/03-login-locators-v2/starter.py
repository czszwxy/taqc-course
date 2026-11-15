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


# твій код тут: регістр email, пробіли навколо email і поле Email після Log out без Remember me
