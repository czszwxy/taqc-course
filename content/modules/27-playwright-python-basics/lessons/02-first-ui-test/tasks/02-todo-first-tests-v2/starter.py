from playwright.sync_api import Page, expect


def test_todo_page_is_shown(page: Page):
    page.goto("/playground/todo")

    expect(page.get_by_role("heading", name="My tasks")).to_be_visible()
    expect(page.get_by_placeholder("What needs to be done?")).to_be_visible()


def test_starts_with_three_tasks(page: Page):
    page.goto("/playground/todo")
    # твій код тут: 3 задачі і лічильник "2 items left"


def test_add_button_adds_a_task(page: Page):
    page.goto("/playground/todo")
    # твій код тут: додай "Write Playwright tests" кнопкою Add і перевір список та лічильник
