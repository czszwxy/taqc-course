import re

import pytest
from playwright.sync_api import Page, expect


@pytest.fixture
def lab(page: Page) -> Page:
    """Opens the DevTools Lab and gives the page to the test."""
    page.goto("/playground/devtools")
    return page


def test_apply_without_a_server_check_is_rejected(lab: Page):
    apply = lab.get_by_test_id("apply-promo")
    expect(apply).to_be_disabled()

    apply.evaluate("button => button.removeAttribute('disabled')")
    apply.click()

    expect(lab.get_by_test_id("promo-message")).to_contain_text("Server rejected the request (403)")


# твій код тут: фікстура console_errors (lab має від неї залежати), тести Calculate total і Log out
