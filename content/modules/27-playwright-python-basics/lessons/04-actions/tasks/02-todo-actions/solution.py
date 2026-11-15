from playwright.sync_api import Page, expect


def test_enter_adds_a_task(page: Page):
    page.goto("/playground/todo")
    new_task = page.get_by_placeholder("What needs to be done?")

    new_task.fill("Write Playwright tests")
    new_task.press("Enter")

    expect(page.get_by_test_id("todo-item").filter(has_text="Write Playwright tests")).to_be_visible()
    expect(page.get_by_test_id("todo-counter")).to_have_text("3 items left")


def test_escape_cancels_editing(page: Page):
    page.goto("/playground/todo")
    coffee = page.get_by_test_id("todo-item").filter(has_text="Buy coffee")

    coffee.get_by_role("button", name="Edit").click()
    page.get_by_label("Edit task").fill("Buy tea")
    page.get_by_label("Edit task").press("Escape")

    expect(page.get_by_test_id("todo-text").filter(has_text="Buy coffee")).to_be_visible()
    expect(page.get_by_text("Buy tea")).to_have_count(0)


def test_completed_state_survives_a_reload(page: Page):
    page.goto("/playground/todo")
    coffee = page.get_by_test_id("todo-item").filter(has_text="Buy coffee")

    coffee.get_by_role("checkbox").check()
    page.reload()

    expect(coffee.get_by_role("checkbox")).to_be_checked()


def test_clear_completed_keeps_active_tasks(page: Page):
    page.goto("/playground/todo")

    page.get_by_role("button", name="Clear completed").click()

    expect(page.get_by_test_id("todo-item")).to_have_count(2)
    expect(page.get_by_test_id("todo-item").filter(has_text="Report the cart bug")).to_be_visible()
    expect(page.get_by_test_id("todo-item").filter(has_text="Buy coffee")).to_be_visible()


def test_task_of_100_characters_is_accepted(page: Page):
    page.goto("/playground/todo")
    new_task = page.get_by_placeholder("What needs to be done?")

    new_task.fill("x" * 100)
    new_task.press("Enter")

    expect(page.get_by_test_id("todo-item")).to_have_count(4)
