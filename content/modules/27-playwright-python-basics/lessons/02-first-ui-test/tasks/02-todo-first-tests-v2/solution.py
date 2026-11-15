from playwright.sync_api import Page, expect


def test_todo_page_is_shown(page: Page):
    page.goto("/playground/todo")

    expect(page.get_by_role("heading", name="My tasks")).to_be_visible()
    expect(page.get_by_placeholder("What needs to be done?")).to_be_visible()


def test_starts_with_three_tasks(page: Page):
    page.goto("/playground/todo")

    expect(page.get_by_test_id("todo-item")).to_have_count(3)
    expect(page.get_by_test_id("todo-counter")).to_have_text("2 items left")


def test_add_button_adds_a_task(page: Page):
    page.goto("/playground/todo")

    page.get_by_placeholder("What needs to be done?").fill("Write Playwright tests")
    page.get_by_role("button", name="Add").click()

    expect(page.get_by_text("Write Playwright tests")).to_be_visible()
    expect(page.get_by_test_id("todo-item")).to_have_count(4)
    expect(page.get_by_test_id("todo-counter")).to_have_text("3 items left")
