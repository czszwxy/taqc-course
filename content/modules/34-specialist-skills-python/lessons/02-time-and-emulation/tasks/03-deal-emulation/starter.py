import pytest
from playwright.sync_api import BrowserContext, Page, expect

LVIV = {"latitude": 49.84, "longitude": 24.03}


@pytest.mark.browser_context_args(geolocation=LVIV, permissions=["geolocation"])
def test_nearest_store_for_lviv_is_lviv(page: Page):
    page.goto("/playground/deal")

    page.get_by_role("button", name="Find nearest store").click()

    expect(page.get_by_test_id("store-result")).to_have_text("Nearest store: Lviv")


# твій код тут: офлайн і повернення мережі, Харків → Kyiv, відмова в геолокації, часовий пояс Europe/Kyiv
