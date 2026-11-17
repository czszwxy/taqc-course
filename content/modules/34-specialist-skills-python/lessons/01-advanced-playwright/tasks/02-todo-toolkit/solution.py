from playwright.sync_api import Page, expect

STORAGE_KEY = "qa-playground:todo"
SAVED_AS_DONE = """([key, text]) => JSON.parse(localStorage.getItem(key) || '[]')
    .some((task) => task.text === text && task.done === true)"""


def row(page: Page, text: str):
    """The list row of the task with this text."""
    return page.get_by_test_id("todo-item").filter(has_text=text)


def expect_items_left(page: Page, count: int) -> None:
    """The counter shows the number of active tasks with the right singular / plural form."""
    word = "item" if count == 1 else "items"
    expect(page.get_by_test_id("todo-counter"), f"{count} active task(s) expected").to_have_text(f"{count} {word} left")


def test_adding_a_task_increases_the_counter(page: Page):
    page.goto("/playground/todo")
    new_task = page.get_by_placeholder("What needs to be done?")

    new_task.fill("Pay the electricity bill")
    new_task.press("Enter")

    expect_items_left(page, 3)


def test_one_active_task_is_counted_in_the_singular(page: Page):
    page.goto("/playground/todo")

    row(page, "Buy coffee").get_by_role("checkbox").check()

    expect_items_left(page, 1)


def test_deleting_an_active_task_decreases_the_counter(page: Page):
    page.goto("/playground/todo")

    row(page, "Buy coffee").get_by_role("button", name="Delete").click()

    expect(page.get_by_test_id("todo-item")).to_have_count(2)
    expect_items_left(page, 1)


def test_completed_state_is_saved_to_local_storage(page: Page):
    page.goto("/playground/todo")

    row(page, "Buy coffee").get_by_role("checkbox").check()

    page.wait_for_function(SAVED_AS_DONE, arg=[STORAGE_KEY, "Buy coffee"])
