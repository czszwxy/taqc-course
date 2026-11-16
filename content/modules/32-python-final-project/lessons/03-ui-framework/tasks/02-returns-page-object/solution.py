import pytest
import requests
from playwright.sync_api import Page, expect

TIMEOUT = 5
ANNA = "anna.koval@example.test"


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
        self.confirmation = page.get_by_test_id("confirmation")

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

    def quantity(self, line_id: int):
        return self.page.get_by_test_id(f"qty-{line_id}")

    def set_condition(self, label: str):
        self.page.get_by_label(label, exact=True).check()

    def return_number(self) -> str:
        return self.page.get_by_test_id("return-number").inner_text().lstrip("#")


@pytest.fixture
def created_returns(base_url):
    """(return number, email) pairs created through the page; cancelled through the API after the test."""
    created = []
    yield created
    for number, email in created:
        requests.delete(f"{base_url}/api/returns/{number}", params={"email": email}, timeout=TIMEOUT)


def test_changed_mind_refund_deducts_return_shipping(page: Page):
    returns = ReturnsPage(page).open().find_order(5001, ANNA)

    returns.item("Wireless Headphones H1").check()
    returns.reason.select_option("changed-mind")

    expect(returns.refund).to_have_text("2,909 UAH")


def test_plus_is_disabled_at_the_bought_quantity(page: Page):
    returns = ReturnsPage(page).open().find_order(5001, ANNA)

    returns.item("USB-C Cable 1 m").check()
    returns.increase("USB-C Cable 1 m").click()
    returns.increase("USB-C Cable 1 m").click()

    expect(returns.quantity(2)).to_have_text("3")
    expect(returns.increase("USB-C Cable 1 m")).to_be_disabled()


def test_switching_to_opened_reprices_the_refund(page: Page):
    returns = ReturnsPage(page).open().find_order(5001, ANNA)
    returns.item("Wireless Headphones H1").check()
    returns.reason.select_option("changed-mind")
    expect(returns.refund).to_have_text("2,909 UAH")

    returns.set_condition("Opened")

    expect(returns.refund).to_have_text("2,460 UAH")


def test_comment_of_300_characters_is_accepted(page: Page, created_returns):
    returns = ReturnsPage(page).open().find_order(5001, ANNA)
    returns.item("Wireless Headphones H1").check()
    returns.reason.select_option("defective")

    returns.comment.fill("x" * 300)
    returns.request_button.click()

    expect(returns.confirmation).to_be_visible()
    created_returns.append((returns.return_number(), ANNA))
