from playwright.sync_api import Page, expect


def test_adding_a_task_increases_the_counter(page: Page):
    page.goto("/playground/todo")
    new_task = page.get_by_placeholder("What needs to be done?")

    new_task.fill("Pay the electricity bill")
    new_task.press("Enter")

    expect(page.get_by_test_id("todo-counter")).to_have_text("3 items left")


# твій код тут: однина в лічильнику, видалення активної задачі, Clear completed
