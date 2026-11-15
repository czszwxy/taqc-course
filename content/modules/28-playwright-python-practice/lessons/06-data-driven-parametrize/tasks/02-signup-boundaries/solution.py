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
AGE_RANGE = "Age must be between 18 and 65"
PASSWORD_LENGTH = "Password must be 8–20 characters"


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


@pytest.mark.parametrize("age", ["18", "30", "65"], ids=["min", "inside", "max"])
def test_valid_age_is_accepted(page: Page, age):
    register(page, age=age)

    expect(page.get_by_role("heading", name=WELCOME)).to_be_visible()


@pytest.mark.parametrize(
    ("age", "message"),
    [("17", AGE_RANGE), ("66", AGE_RANGE), ("abc", "Age must be a whole number")],
    ids=["below-min", "above-max", "not-a-number"],
)
def test_invalid_age_is_rejected(page: Page, age, message):
    register(page, age=age)

    expect(page.get_by_test_id("error-age")).to_have_text(message)
    expect(page.get_by_role("heading", name=WELCOME)).to_be_hidden()


@pytest.mark.parametrize("password", ["Abcdefg1", "Abcdefghij1234567890"], ids=["8-chars", "20-chars"])
def test_valid_password_length_is_accepted(page: Page, password):
    register(page, password=password, confirm=password)

    expect(page.get_by_role("heading", name=WELCOME)).to_be_visible()


@pytest.mark.parametrize("password", ["Abcdef1", "Abcdefghij12345678901"], ids=["7-chars", "21-chars"])
def test_invalid_password_length_is_rejected(page: Page, password):
    register(page, password=password, confirm=password)

    expect(page.get_by_test_id("error-password")).to_have_text(PASSWORD_LENGTH)
