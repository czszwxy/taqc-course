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
        self.email_error = page.get_by_test_id("error-email")
        self.welcome = page.get_by_role("heading", name="Welcome back!")

    def goto(self):
        self.page.goto(self.URL)

    def sign_in(self, email: str, password: str):
        self.email.fill(email)
        self.password.fill(password)
        self.submit_button.click()

    def request_password_reset(self):
        self.forgot_button.click()


def open_login(page: Page) -> LoginPage:
    login = LoginPage(page)
    login.goto()
    return login


def test_demo_user_can_sign_in(page: Page):
    login = open_login(page)

    login.sign_in("demo@taskly.test", "Demo1234")

    expect(login.welcome).to_be_visible()


def test_spaces_around_email_are_ignored(page: Page):
    login = open_login(page)

    login.sign_in("  demo@taskly.test  ", "Demo1234")

    expect(login.welcome).to_be_visible()


def test_three_failed_attempts_lock_the_account(page: Page):
    login = open_login(page)

    for _ in range(3):
        login.sign_in("demo@taskly.test", "wrong-pass")
    login.sign_in("demo@taskly.test", "Demo1234")

    expect(login.error_message).to_have_text("Too many failed attempts. Try again in 15 minutes.")
    expect(login.welcome).to_be_hidden()


def test_password_reset_needs_an_email(page: Page):
    login = open_login(page)

    login.request_password_reset()

    expect(login.email_error).to_have_text("Enter your email first")
