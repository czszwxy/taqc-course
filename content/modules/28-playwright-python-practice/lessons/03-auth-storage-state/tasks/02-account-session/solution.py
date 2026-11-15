import pytest
from playwright.sync_api import Page, expect

USER = {"email": "qa@gadgetly.test", "password": "Test1234"}


def sign_in_via_ui(page: Page):
    page.goto("/playground/account")
    page.get_by_label("Email").fill(USER["email"])
    page.get_by_label("Password").fill(USER["password"])
    page.get_by_role("button", name="Sign in").click()
    expect(page.get_by_role("heading", name="My account")).to_be_visible()


@pytest.fixture(scope="session")
def auth_state(browser, base_url, tmp_path_factory):
    """Signs in once for the whole run and returns the saved storage state file."""
    context = browser.new_context(base_url=base_url)
    sign_in_via_ui(context.new_page())
    path = tmp_path_factory.mktemp("auth") / "state.json"
    context.storage_state(path=path)
    context.close()
    return path


def test_session_survives_a_reload(page: Page):
    sign_in_via_ui(page)

    page.reload()

    expect(page.get_by_role("heading", name="My account")).to_be_visible()


def test_sign_out_forgets_the_session(page: Page):
    sign_in_via_ui(page)

    page.get_by_role("button", name="Sign out").click()
    expect(page.get_by_role("heading", name="Sign in to your account")).to_be_visible()

    page.reload()
    expect(page.get_by_role("heading", name="Sign in to your account")).to_be_visible()


def test_saved_state_skips_the_login_form(new_context, auth_state):
    page = new_context(storage_state=auth_state).new_page()

    page.goto("/playground/account")

    expect(page.get_by_role("heading", name="My account")).to_be_visible()
    expect(page.get_by_test_id("account-email")).to_have_text("Signed in as qa@gadgetly.test")


def test_token_from_the_api_skips_the_login_form(new_context, playwright, base_url):
    api = playwright.request.new_context(base_url=base_url)
    response = api.post("/api/auth/login", data=USER)
    assert response.ok
    token = response.json()["token"]
    api.dispose()
    state = {"cookies": [], "origins": [{"origin": base_url, "localStorage": [{"name": "gadgetly:token", "value": token}]}]}

    page = new_context(storage_state=state).new_page()
    page.goto("/playground/account")

    expect(page.get_by_role("heading", name="My account")).to_be_visible()
