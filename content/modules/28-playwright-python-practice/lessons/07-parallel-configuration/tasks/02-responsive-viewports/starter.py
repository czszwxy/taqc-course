import pytest
from playwright.sync_api import Page, expect

PHONE = {"width": 375, "height": 812}


@pytest.mark.browser_context_args(viewport=PHONE)
def test_phone_shows_the_menu_button(page: Page):
    page.goto("/playground/responsive")

    expect(page.get_by_role("button", name="Open menu")).to_be_visible()


# твій код тут: Add to cart на телефоні, без горизонтального скролу на 320/375/414, навігація на планшеті 800
