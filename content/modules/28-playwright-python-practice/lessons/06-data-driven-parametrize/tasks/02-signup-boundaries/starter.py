import pytest
from playwright.sync_api import Page, expect

VALID = {
    "full_name": "Olena Kovalenko",
    "email": "olena.k@example.com",
    "age": "30",
    "password": "Secret123",
    "confirm": "Secret123",
    "country": "Ukraine",
}
WELCOME = "Welcome, Olena Kovalenko!"


def register(page: Page, **changes):
    """Fills the form with VALID data (changes replace values), accepts the Terms and submits."""
    values = {**VALID, **changes}
    page.goto("/playground/signup")
    page.get_by_label("Full name").fill(values["full_name"])
    page.get_by_label("Email").fill(values["email"])
    page.get_by_label("Age").fill(values["age"])
    page.get_by_label("Password", exact=True).fill(values["password"])
    page.get_by_label("Confirm password").fill(values["confirm"])
    page.get_by_label("Country").select_option(values["country"])
    page.get_by_label("I agree to the Terms of Service").check()
    page.get_by_role("button", name="Create account").click()


@pytest.mark.parametrize("age", ["30", "65"], ids=["inside", "max"])
def test_valid_age_is_accepted(page: Page, age):
    register(page, age=age)

    expect(page.get_by_role("heading", name=WELCOME)).to_be_visible()


# твій код тут: межа 18, невалідний вік (17, 66, abc), валідні паролі (8 і 20), невалідні паролі (7 і 21)
