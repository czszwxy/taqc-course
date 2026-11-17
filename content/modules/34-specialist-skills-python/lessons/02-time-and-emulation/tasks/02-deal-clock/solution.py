import pytest
from playwright.sync_api import Page, expect


@pytest.fixture
def deal_page(page: Page) -> Page:
    """The deal page with a fake clock: the page thinks it is 12:00:00 UTC, so the deal ends at 12:05:00."""
    page.clock.install(time="2026-03-20T12:00:00Z")
    page.goto("/playground/deal")
    return page


def test_deal_price_is_shown_while_the_deal_is_active(deal_page: Page):
    deal_page.clock.pause_at("2026-03-20T12:00:10Z")

    expect(deal_page.get_by_test_id("deal-timer")).to_have_text("04:50")
    expect(deal_page.get_by_test_id("deal-price")).to_have_text("2,399 UAH")
    expect(deal_page.get_by_role("button", name="Buy now")).to_be_enabled()


def test_timer_keeps_the_mm_ss_format_in_the_last_seconds(deal_page: Page):
    deal_page.clock.pause_at("2026-03-20T12:04:51Z")

    expect(deal_page.get_by_test_id("deal-timer")).to_have_text("00:09")


def test_when_the_time_is_up_the_deal_ends(deal_page: Page):
    deal_page.clock.pause_at("2026-03-20T12:04:51Z")

    deal_page.clock.fast_forward("00:09")

    expect(deal_page.get_by_test_id("deal-ended")).to_have_text("Deal ended")
    expect(deal_page.get_by_test_id("deal-price")).to_have_text("2,999 UAH")
    expect(deal_page.get_by_role("button", name="Buy now")).to_be_disabled()


def test_added_to_cart_message_disappears_after_5_seconds(deal_page: Page):
    deal_page.clock.pause_at("2026-03-20T12:01:00Z")
    deal_page.get_by_role("button", name="Buy now").click()
    expect(deal_page.get_by_test_id("toast")).to_contain_text("Wireless Headphones H1")

    deal_page.clock.fast_forward(5000)

    expect(deal_page.get_by_test_id("toast")).to_have_count(0)
