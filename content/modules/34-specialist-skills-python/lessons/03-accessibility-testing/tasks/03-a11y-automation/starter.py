import pytest
from axe_playwright_python.sync_playwright import Axe
from playwright.sync_api import Page, expect

WCAG_A_AA = {"runOnly": {"type": "tag", "values": ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]}}


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


# твій код тут: скан axe (Axe().run), Show details з клавіатури, оголошена помилка email, фокус у діалозі та Escape
