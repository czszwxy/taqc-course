import pytest
from playwright.sync_api import Page, expect


@pytest.fixture
def account(page: Page) -> Page:
    """Signs in to My account and gives the page to the test."""
    page.goto("/playground/account")
    page.get_by_label("Email").fill("qa@gadgetly.test")
    page.get_by_label("Password").fill("Test1234")
    page.get_by_role("button", name="Sign in").click()
    expect(page.get_by_role("heading", name="My account")).to_be_visible()
    return page


def test_export_shows_an_alert_then_a_status(account: Page):
    messages = []

    def answer(dialog):
        messages.append(f"{dialog.type}: {dialog.message}")
        dialog.accept()

    account.once("dialog", answer)
    account.get_by_role("button", name="Export my data").click()

    expect(account.get_by_test_id("export-status")).to_have_text("Export requested")
    assert messages == ["alert: Your data export has started. We will email you a link."]


# твій код тут: Cancel у Delete account, порожній Rename, Terms у новій вкладці, Help chat у фреймі
