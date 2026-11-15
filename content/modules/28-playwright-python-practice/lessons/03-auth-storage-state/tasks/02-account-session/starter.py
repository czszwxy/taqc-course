import pytest
from playwright.sync_api import Page, expect

USER = {"email": "qa@gadgetly.test", "password": "Test1234"}


def sign_in_via_ui(page: Page):
    page.goto("/playground/account")
    page.get_by_label("Email").fill(USER["email"])
    page.get_by_label("Password").fill(USER["password"])
    page.get_by_role("button", name="Sign in").click()
    expect(page.get_by_role("heading", name="My account")).to_be_visible()


def test_session_survives_a_reload(page: Page):
    sign_in_via_ui(page)

    page.reload()

    expect(page.get_by_role("heading", name="My account")).to_be_visible()


# твій код тут: Sign out, session-фікстура auth_state зі storage_state і вхід через API-токен
