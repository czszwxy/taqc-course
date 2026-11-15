from playwright.sync_api import Page, expect


def test_laptops_in_stock(page: Page):
    page.goto("/playground/search")

    page.get_by_label("Category").select_option("Laptops")
    page.get_by_label("In stock only").check()

    expect(page.get_by_test_id("result-count")).to_have_text("2 products found")


def test_search_ignores_case(page: Page):
    page.goto("/playground/search")
    cards = page.get_by_test_id("results").get_by_role("listitem")

    page.get_by_label("Search").fill("MOUSE")

    expect(cards).to_have_count(2)
    expect(cards.filter(has_text="Gaming Mouse X7")).to_be_visible()


def test_max_price_is_inclusive(page: Page):
    page.goto("/playground/search")
    cards = page.get_by_test_id("results").get_by_role("listitem")

    page.get_by_label("Category").select_option("Accessories")
    page.get_by_label("Max price").fill("2199")

    expect(cards.filter(has_text="Mechanical Keyboard K8")).to_have_count(1)


def test_clear_filters_resets_everything(page: Page):
    page.goto("/playground/search")
    cards = page.get_by_test_id("results").get_by_role("listitem")

    page.get_by_label("Search").fill("Phone")
    page.get_by_label("Category").select_option("Phones")
    page.get_by_label("In stock only").check()
    page.get_by_role("button", name="Clear filters").click()

    expect(page.get_by_label("Search")).to_have_value("")
    expect(page.get_by_label("In stock only")).not_to_be_checked()
    expect(cards).to_have_count(14)
