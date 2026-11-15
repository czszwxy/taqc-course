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


def submit(page: Page):
    page.get_by_label("I agree to the Terms of Service").check()
    page.get_by_role("button", name="Create account").click()


def test_valid_data_creates_an_account(page: Page):
    page.goto("/playground/signup")

    fill_form(page)
    submit(page)

    expect(page.get_by_role("heading", name="Welcome, Olena Kovalenko!")).to_be_visible()


def test_terms_must_be_accepted(page: Page):
    page.goto("/playground/signup")

    fill_form(page)
    page.get_by_role("button", name="Create account").click()

    expect(page.get_by_text("You must accept the Terms of Service")).to_be_visible()
    expect(page.get_by_role("heading", name="Welcome, Olena Kovalenko!")).to_be_hidden()


def test_passwords_must_match(page: Page):
    page.goto("/playground/signup")

    fill_form(page, confirm="Secret124")
    submit(page)

    expect(page.get_by_text("Passwords do not match")).to_be_visible()


def test_email_needs_a_dot_in_the_domain(page: Page):
    page.goto("/playground/signup")

    fill_form(page, email="olena@example")
    submit(page)

    expect(page.get_by_text("Enter a valid email address")).to_be_visible()


def test_password_of_20_characters_is_accepted(page: Page):
    page.goto("/playground/signup")
    password = "Secret12345678901234"

    fill_form(page, password=password, confirm=password)
    submit(page)

    expect(page.get_by_role("heading", name="Welcome, Olena Kovalenko!")).to_be_visible()
