import re

import pytest
from playwright.sync_api import Page, expect


@pytest.fixture
def console_errors(page: Page) -> list[str]:
    """Collects console errors and uncaught page errors of this test's page."""
    errors = []

    def remember(message):
        if message.type == "error":
            errors.append(message.text)

    page.on("console", remember)
    page.on("pageerror", lambda error: errors.append(str(error)))
    return errors


@pytest.fixture
def lab(page: Page, console_errors) -> Page:
    """Opens the DevTools Lab after the console listeners are attached."""
    page.goto("/playground/devtools")
    return page


def test_apply_without_a_server_check_is_rejected(lab: Page):
    apply = lab.get_by_test_id("apply-promo")
    expect(apply).to_be_disabled()

    apply.evaluate("button => button.removeAttribute('disabled')")
    apply.click()

    expect(lab.get_by_test_id("promo-message")).to_contain_text("Server rejected the request (403)")


def test_calculate_total_writes_no_console_errors(lab: Page, console_errors):
    lab.get_by_role("button", name="Calculate total").click()

    expect(lab.get_by_test_id("total-message")).to_have_text(re.compile(r"^Total: "))
    assert console_errors == []


def test_log_out_removes_the_cart(lab: Page):
    assert lab.evaluate("localStorage.getItem('lab:cart')") is not None

    lab.get_by_role("button", name="Log out").click()

    lab.wait_for_function("() => localStorage.getItem('lab:cart') === null")
