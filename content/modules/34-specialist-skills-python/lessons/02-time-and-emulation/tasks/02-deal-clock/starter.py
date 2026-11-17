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


# твій код тут: таймер за 9 секунд до кінця, стан після завершення акції, зникнення повідомлення
