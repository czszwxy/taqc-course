import re

from playwright.sync_api import Page, expect


def test_search_ignores_the_letter_case(page: Page):
    page.goto("/playground/search")

    page.get_by_label("Search").fill("MOUSE")

    expect(page.get_by_test_id("results").get_by_role("listitem")).to_have_count(2)
    expect(page.get_by_test_id("result-count")).to_have_text("2 products found")


def test_with_in_stock_only_the_counter_equals_the_number_of_cards(page: Page):
    page.goto("/playground/search")

    page.get_by_label("In stock only").check()

    expect(page.get_by_test_id("results").get_by_role("listitem")).to_have_count(10)
    expect(page.get_by_test_id("result-count")).to_have_text("10 products found")


def test_price_high_to_low_sorts_prices_in_descending_order(page: Page):
    page.goto("/playground/search")

    page.get_by_label("Sort by").select_option("price-desc")

    expect(page.get_by_test_id("product-name").first).to_have_text("Laptop Pro 15")
    texts = page.get_by_test_id("product-price").all_inner_texts()
    prices = [int(re.sub(r"\D", "", text)) for text in texts]
    assert prices == sorted(prices, reverse=True)
