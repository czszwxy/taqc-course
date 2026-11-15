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


def test_cancelling_delete_keeps_the_account(account: Page):
    account.once("dialog", lambda dialog: dialog.dismiss())

    account.get_by_role("button", name="Delete account").click()

    expect(account.get_by_role("heading", name="My account")).to_be_visible()
    expect(account.get_by_role("button", name="Delete account")).to_be_visible()


def test_an_empty_display_name_is_rejected(account: Page):
    messages = []

    def answer(dialog):
        messages.append(f"{dialog.type}: {dialog.message}")
        if dialog.type == "prompt":
            dialog.accept("")
        else:
            dialog.accept()

    account.on("dialog", answer)
    account.get_by_role("button", name="Rename").click()

    expect(account.get_by_test_id("display-name")).to_have_text("Olena Tester")
    assert messages == ["prompt: New display name", "alert: Display name cannot be empty"]


def test_terms_open_in_a_new_tab(account: Page):
    with account.expect_popup() as popup_info:
        account.get_by_role("link", name="Terms of Service").click()
    terms = popup_info.value

    expect(terms.get_by_role("heading", name="Gadgetly Terms of Service")).to_be_visible(timeout=10_000)
    expect(account.get_by_role("heading", name="My account")).to_be_visible()


def test_help_chat_requires_a_question(account: Page):
    chat = account.frame_locator('iframe[title="Help chat"]')

    chat.get_by_role("button", name="Send").click()
    expect(chat.get_by_role("alert")).to_have_text("Please type your question")

    chat.get_by_label("Your question").fill("Where is my order #1002?")
    chat.get_by_role("button", name="Send").click()
    expect(chat.get_by_role("status")).to_have_text("Thanks! We'll reply within 24 hours.")
