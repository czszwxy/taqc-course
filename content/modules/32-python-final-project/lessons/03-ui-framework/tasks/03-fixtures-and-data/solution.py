from dataclasses import dataclass

import pytest
import requests
from playwright.sync_api import Page, expect

TIMEOUT = 5


@dataclass(frozen=True)
class Customer:
    order: int
    email: str


ANNA = Customer(5001, "anna.koval@example.test")
MAX = Customer(5002, "max.bondar@example.test")
OLHA = Customer(5004, "olha.melnyk@example.test")
IVAN = Customer(5006, "ivan.shevchuk@example.test")


class ReturnsPage:
    URL = "/playground/returns"

    def __init__(self, page: Page):
        self.page = page
        self.order_number = page.get_by_label("Order number")
        self.email = page.get_by_label("Email", exact=True)
        self.find_button = page.get_by_role("button", name="Find order")
        self.order_card = page.get_by_test_id("order-card")
        self.reason = page.get_by_label("Reason")
        self.comment = page.get_by_label("Comment")
        self.request_button = page.get_by_role("button", name="Request return")
        self.refund = page.get_by_test_id("summary-refund")
        self.quote_error = page.get_by_test_id("quote-error")
        self.confirmation = page.get_by_test_id("confirmation")
        self.confirmation_refund = page.get_by_test_id("confirmation-refund")

    def open(self):
        self.page.goto(self.URL)
        return self

    def find_order(self, number: int, email: str):
        self.order_number.fill(str(number))
        self.email.fill(email)
        self.find_button.click()
        expect(self.order_card).to_contain_text(f"Order #{number}")
        return self

    def item(self, name: str):
        return self.page.get_by_role("checkbox", name=f"Return {name}")

    def increase(self, name: str):
        return self.page.get_by_role("button", name=f"Increase {name}")

    def set_condition(self, label: str):
        self.page.get_by_label(label, exact=True).check()

    def return_number(self) -> str:
        return self.page.get_by_test_id("return-number").inner_text().lstrip("#")


@pytest.fixture
def returns_page(page: Page) -> ReturnsPage:
    return ReturnsPage(page).open()


@pytest.fixture
def created_returns(base_url):
    """(return number, email) pairs created through the page; cancelled through the API after the test."""
    created = []
    yield created
    for number, email in created:
        requests.delete(f"{base_url}/api/returns/{number}", params={"email": email}, timeout=TIMEOUT)


def test_changed_mind_refund_deducts_return_shipping(returns_page):
    returns_page.find_order(ANNA.order, ANNA.email)

    returns_page.item("Wireless Headphones H1").check()
    returns_page.reason.select_option("changed-mind")

    expect(returns_page.refund).to_have_text("2,909 UAH")


@pytest.mark.parametrize(
    "order, email, item, reason, refund",
    [
        (5002, MAX.email, "Mechanical Keyboard K8", "changed-mind", "2,109 UAH"),
        (5003, MAX.email, "Noise Cancelling Headphones", "defective", "8,999 UAH"),
        (5004, OLHA.email, "Phone Mini", "defective", "9,999 UAH"),
    ],
    ids=["day-14-changed-mind", "day-15-defective", "day-30-defective"],
)
def test_return_is_allowed_inside_the_window(returns_page, order, email, item, reason, refund):
    returns_page.find_order(order, email)

    returns_page.item(item).check()
    returns_page.reason.select_option(reason)

    expect(returns_page.refund).to_have_text(refund)


@pytest.mark.parametrize(
    "order, email, item, reason",
    [
        (5003, MAX.email, "Noise Cancelling Headphones", "changed-mind"),
        (5006, IVAN.email, "Webcam 4K", "defective"),
    ],
    ids=["day-15-changed-mind", "day-31-defective"],
)
def test_return_is_rejected_after_the_window(returns_page, order, email, item, reason):
    returns_page.find_order(order, email)

    returns_page.item(item).check()
    returns_page.reason.select_option(reason)

    expect(returns_page.quote_error).to_contain_text("Return window closed")
    expect(returns_page.quote_error).to_contain_text("2026-03-19")


def test_confirmation_shows_the_same_refund_as_the_summary(returns_page, created_returns):
    returns_page.find_order(ANNA.order, ANNA.email)
    returns_page.item("Wireless Headphones H1").check()
    returns_page.reason.select_option("changed-mind")
    expect(returns_page.refund).to_have_text("2,909 UAH")

    returns_page.request_button.click()

    expect(returns_page.confirmation).to_be_visible()
    created_returns.append((returns_page.return_number(), ANNA.email))
    expect(returns_page.confirmation_refund).to_have_text("2,909 UAH")
