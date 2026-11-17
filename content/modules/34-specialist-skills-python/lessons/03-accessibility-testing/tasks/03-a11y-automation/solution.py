import pytest
from axe_playwright_python.sync_playwright import Axe
from playwright.sync_api import Page, expect

WCAG_A_AA = {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]}}
EMAIL_ERROR = "Enter a valid email address"


@pytest.fixture(autouse=True)
def open_product_page(page: Page):
    """Every test starts on the rendered product page (scan only after the content is there)."""
    page.goto("/playground/a11y")
    expect(page.get_by_test_id("product-page")).to_be_visible()


def test_the_wishlist_icon_button_has_a_name_and_a_pressed_state(page: Page):
    wishlist = page.get_by_role("button", name="Add to wishlist")

    wishlist.click()

    expect(wishlist).to_have_attribute("aria-pressed", "true")
    expect(page.get_by_test_id("wishlist-status")).to_have_text("Saved to your wishlist")


def test_the_page_has_no_automatically_detectable_wcag_violations(page: Page):
    results = Axe().run(page, options=WCAG_A_AA)

    rule_ids = [violation["id"] for violation in results.response["violations"]]
    assert rule_ids == [], results.generate_report()


def test_show_details_is_a_button_that_works_from_the_keyboard(page: Page):
    toggle = page.get_by_role("button", name="Show details")

    toggle.focus()
    page.keyboard.press("Enter")

    expect(page.get_by_test_id("details")).to_be_visible()
    expect(page.get_by_role("button", name="Hide details")).to_have_attribute("aria-expanded", "true")


def test_the_email_error_is_announced_and_linked_to_the_field(page: Page):
    page.get_by_role("button", name="Subscribe").click()

    expect(page.get_by_role("alert")).to_have_text(EMAIL_ERROR)
    expect(page.get_by_role("textbox", name="Email")).to_have_accessible_description(EMAIL_ERROR)


def test_the_dialog_takes_focus_closes_on_escape_and_returns_focus(page: Page):
    page.get_by_role("textbox", name="Email").fill("qa@example.test")
    page.get_by_role("button", name="Subscribe").click()

    dialog = page.get_by_role("dialog", name="You're subscribed!")
    expect(dialog).to_be_visible()
    expect(dialog.get_by_role("button", name="Close")).to_be_focused()

    page.keyboard.press("Escape")

    expect(dialog).to_have_count(0)
    expect(page.get_by_role("button", name="Subscribe")).to_be_focused()
