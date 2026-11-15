from playwright.sync_api import Page, expect


def test_enter_adds_a_task(page: Page):
    page.goto("/playground/todo")
    new_task = page.get_by_placeholder("What needs to be done?")

    new_task.fill("Write Playwright tests")
    new_task.press("Enter")

    expect(page.get_by_test_id("todo-item").filter(has_text="Write Playwright tests")).to_be_visible()
    expect(page.get_by_test_id("todo-counter")).to_have_text("3 items left")


# твій код тут: Esc під час редагування, позначка після reload, Clear completed і задача зі 100 символів
