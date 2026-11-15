import re

from playwright.sync_api import Page, expect

VALID = {
    "full_name": "Olena Kovalenko",
    "email": "olena.k@example.com",
    "age": "30",
    "password": "Secret123",
    "confirm": "Secret123",
    "country": "Ukraine",
}


class SignupPage:
    URL = "/playground/signup"

    def __init__(self, page: Page):
        self.page = page
        self.terms = page.get_by_label("I agree to the Terms of Service")
        self.submit_button = page.get_by_role("button", name="Create account")
        self.welcome = page.get_by_role("heading", name=re.compile(r"^Welcome,"))

    def goto(self):
        self.page.goto(self.URL)

    def fill(self, **changes):
        """Fills every field with VALID data; changes replace values: fill(age="18")."""
        values = {**VALID, **changes}
        self.page.get_by_label("Full name").fill(values["full_name"])
        self.page.get_by_label("Email").fill(values["email"])
        self.page.get_by_label("Age").fill(values["age"])
        self.page.get_by_label("Password", exact=True).fill(values["password"])
        self.page.get_by_label("Confirm password").fill(values["confirm"])
        self.page.get_by_label("Country").select_option(values["country"])

    def register(self, accept_terms=True, **changes):
        """Fills the form, ticks the Terms (unless accept_terms=False) and submits."""
        self.fill(**changes)
        if accept_terms:
            self.terms.check()
        self.submit_button.click()

    def error(self, field: str):
        """The error under a field: error("email") -> data-testid "error-email"."""
        return self.page.get_by_test_id(f"error-{field}")


def open_signup(page: Page) -> SignupPage:
    signup = SignupPage(page)
    signup.goto()
    return signup


def test_valid_data_creates_an_account(page: Page):
    signup = open_signup(page)

    signup.register()

    expect(signup.welcome).to_have_text("Welcome, Olena Kovalenko!")


def test_full_name_of_spaces_is_rejected(page: Page):
    signup = open_signup(page)

    signup.register(full_name="   ")

    expect(signup.error("fullName")).to_have_text("Full name is required")
    expect(signup.welcome).to_be_hidden()


def test_terms_must_be_accepted(page: Page):
    signup = open_signup(page)

    signup.register(accept_terms=False)

    expect(signup.error("terms")).to_have_text("You must accept the Terms of Service")
    expect(signup.welcome).to_be_hidden()


def test_passwords_must_match(page: Page):
    signup = open_signup(page)

    signup.register(confirm="Secret124")

    expect(signup.error("confirm")).to_have_text("Passwords do not match")
