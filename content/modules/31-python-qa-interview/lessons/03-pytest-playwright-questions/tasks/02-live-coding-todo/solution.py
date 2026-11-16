from playwright.sync_api import Page, expect


def test_adding_a_task_increases_the_counter(page: Page):
    page.goto("/playground/todo")
    new_task = page.get_by_placeholder("What needs to be done?")

    new_task.fill("Pay the electricity bill")
    new_task.press("Enter")

    expect(page.get_by_test_id("todo-counter")).to_have_text("3 items left")


def test_one_active_task_uses_singular(page: Page):
    page.goto("/playground/todo")

    page.get_by_test_id("todo-item").filter(has_text="Buy coffee").get_by_role("checkbox").check()

    expect(page.get_by_test_id("todo-counter")).to_have_text("1 item left")


def test_deleting_an_active_task_decreases_the_counter(page: Page):
    page.goto("/playground/todo")
    items = page.get_by_test_id("todo-item")

    items.filter(has_text="Buy coffee").get_by_role("button", name="Delete").click()

    expect(items).to_have_count(2)
    expect(page.get_by_test_id("todo-counter")).to_have_text("1 item left")


def test_clear_completed_keeps_active_tasks(page: Page):
    page.goto("/playground/todo")
    items = page.get_by_test_id("todo-item")

    page.get_by_role("button", name="Clear completed").click()

    expect(items).to_have_count(2)
    expect(items.filter(has_text="Report the cart bug")).to_be_visible()
    expect(items.filter(has_text="Buy coffee")).to_be_visible()
