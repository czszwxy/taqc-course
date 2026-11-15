from playwright.sync_api import Page, expect


def test_sign_in_form_is_shown(page: Page):
    page.goto("/playground/login")

    expect(page.get_by_role("heading", name="Sign in to Taskly")).to_be_visible()
    expect(page.get_by_label("Email")).to_be_visible()
    expect(page.get_by_label("Password", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="Log in")).to_be_visible()


def test_demo_user_can_sign_in(page: Page):
    page.goto("/playground/login")
    # твій код тут: заповни demo@taskly.test / Demo1234, натисни "Log in" і перевір привітання


def test_wrong_password_shows_error(page: Page):
    page.goto("/playground/login")
    # твій код тут: неправильний пароль → "Invalid email or password", заголовка "Welcome back!" немає
