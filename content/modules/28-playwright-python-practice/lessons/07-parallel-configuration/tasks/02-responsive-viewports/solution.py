import pytest
from playwright.sync_api import Page, expect

PHONE = {"width": 375, "height": 812}
TABLET = {"width": 800, "height": 1024}
NO_HORIZONTAL_SCROLL = "document.documentElement.scrollWidth <= window.innerWidth"


@pytest.mark.browser_context_args(viewport=PHONE)
def test_phone_shows_the_menu_button(page: Page):
    page.goto("/playground/responsive")

    expect(page.get_by_role("button", name="Open menu")).to_be_visible()


@pytest.mark.browser_context_args(viewport=PHONE)
def test_phone_can_add_to_cart(page: Page):
    page.goto("/playground/responsive")

    page.get_by_role("button", name="Add to cart").click()

    expect(page.get_by_test_id("added")).to_have_text("Added to cart ✓")


@pytest.mark.parametrize("width", [320, 375, 414])
def test_no_horizontal_scroll_on_phones(page: Page, width):
    page.set_viewport_size({"width": width, "height": 800})
    page.goto("/playground/responsive")
    expect(page.get_by_test_id("specs")).to_be_visible()

    assert page.evaluate(NO_HORIZONTAL_SCROLL)


@pytest.mark.browser_context_args(viewport=TABLET)
def test_tablet_shows_the_navigation_links(page: Page):
    page.goto("/playground/responsive")

    expect(page.get_by_test_id("nav-links")).to_be_visible()
    expect(page.get_by_role("button", name="Open menu")).to_be_hidden()
