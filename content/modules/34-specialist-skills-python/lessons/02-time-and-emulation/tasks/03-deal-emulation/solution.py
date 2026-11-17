import pytest
from playwright.sync_api import BrowserContext, Page, expect

LVIV = {"latitude": 49.84, "longitude": 24.03}
KHARKIV = {"latitude": 49.99, "longitude": 36.23}


@pytest.mark.browser_context_args(geolocation=LVIV, permissions=["geolocation"])
def test_nearest_store_for_lviv_is_lviv(page: Page):
    page.goto("/playground/deal")

    page.get_by_role("button", name="Find nearest store").click()

    expect(page.get_by_test_id("store-result")).to_have_text("Nearest store: Lviv")


@pytest.mark.browser_context_args(geolocation=KHARKIV, permissions=["geolocation"])
def test_nearest_store_for_kharkiv_is_kyiv(page: Page):
    page.goto("/playground/deal")

    page.get_by_role("button", name="Find nearest store").click()

    expect(page.get_by_test_id("store-result")).to_have_text("Nearest store: Kyiv")


def test_without_the_location_permission_the_page_explains_what_to_do(page: Page):
    page.goto("/playground/deal")

    page.get_by_role("button", name="Find nearest store").click()

    expect(page.get_by_test_id("store-error")).to_have_text("Location access denied. Choose a store from the list.")


def test_offline_blocks_buying_until_the_connection_is_back(page: Page, context: BrowserContext):
    page.goto("/playground/deal")
    buy = page.get_by_role("button", name="Buy now")

    context.set_offline(True)
    expect(page.get_by_test_id("offline-banner")).to_have_text("You are offline. Reconnect to buy.")
    expect(buy).to_be_disabled()

    context.set_offline(False)
    expect(page.get_by_test_id("offline-banner")).to_have_count(0)
    expect(buy).to_be_enabled()


@pytest.mark.browser_context_args(timezone_id="Europe/Kyiv")
def test_end_time_is_shown_in_the_users_time_zone(page: Page):
    page.clock.install(time="2026-03-20T12:00:00Z")
    page.goto("/playground/deal")

    expect(page.get_by_test_id("deal-end-time")).to_have_text("14:05")
