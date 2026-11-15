from playwright.sync_api import Page, expect


def test_laptops_in_stock(page: Page):
    page.goto("/playground/search")

    page.get_by_label("Category").select_option("Laptops")
    page.get_by_label("In stock only").check()

    expect(page.get_by_test_id("result-count")).to_have_text("2 products found")


# твій код тут: пошук MOUSE, Max price 2199 і Clear filters
