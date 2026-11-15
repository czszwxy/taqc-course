from playwright.sync_api import Page, expect


class LoginPage:
    URL = "/playground/login"

    def __init__(self, page: Page):
        self.page = page
        self.email = page.get_by_label("Email")
        self.password = page.get_by_label("Password", exact=True)
        self.submit_button = page.get_by_role("button", name="Log in")
        self.forgot_button = page.get_by_role("button", name="Forgot password?")
        self.error_message = page.get_by_test_id("login-error")
        self.welcome = page.get_by_role("heading", name="Welcome back!")

    def goto(self):
        self.page.goto(self.URL)

    def sign_in(self, email: str, password: str):
        self.email.fill(email)
        self.password.fill(password)
        self.submit_button.click()

    # твій код тут: метод request_password_reset() і атрибут email_error (data-testid "error-email")


def test_demo_user_can_sign_in(page: Page):
    login = LoginPage(page)
    login.goto()

    login.sign_in("demo@taskly.test", "Demo1234")

    expect(login.welcome).to_be_visible()


# твій код тут: пробіли навколо email, блокування після 3 спроб, Forgot password? з порожнім Email
