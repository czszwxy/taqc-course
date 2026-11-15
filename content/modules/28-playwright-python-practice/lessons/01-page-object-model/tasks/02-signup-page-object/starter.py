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

    # твій код тут: метод error(field) — локатор помилки під полем (data-testid "error-<field>")


def test_valid_data_creates_an_account(page: Page):
    signup = SignupPage(page)
    signup.goto()

    signup.register()

    expect(signup.welcome).to_have_text("Welcome, Olena Kovalenko!")


# твій код тут: тести на ім'я з пробілів, Terms і різні паролі — лише через SignupPage
