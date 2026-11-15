from playwright.sync_api import Page, expect

VALID = {
    "full_name": "Olena Kovalenko",
    "email": "olena.k@example.com",
    "age": "30",
    "password": "Secret123",
    "confirm": "Secret123",
    "country": "Ukraine",
}


def fill_form(page: Page, **changes):
    """Fills every field except the Terms checkbox; changes replace VALID values: fill_form(page, age="18")."""
    values = {**VALID, **changes}
    page.get_by_label("Full name").fill(values["full_name"])
    page.get_by_label("Email").fill(values["email"])
    page.get_by_label("Age").fill(values["age"])
    page.get_by_label("Password", exact=True).fill(values["password"])
    page.get_by_label("Confirm password").fill(values["confirm"])
    page.get_by_label("Country").select_option(values["country"])


def test_valid_data_creates_an_account(page: Page):
    page.goto("/playground/signup")

    fill_form(page)
    page.get_by_label("I agree to the Terms of Service").check()
    page.get_by_role("button", name="Create account").click()

    expect(page.get_by_role("heading", name="Welcome, Olena Kovalenko!")).to_be_visible()


# твій код тут: тести на Terms, різні паролі, email без крапки і пароль з 20 символів
