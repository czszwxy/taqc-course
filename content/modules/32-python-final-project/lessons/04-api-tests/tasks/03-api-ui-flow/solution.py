import pytest
import requests
from playwright.sync_api import Page, expect

TIMEOUT = 5
ANNA = "anna.koval@example.test"
STRANGER = "someone@example.test"
REFUND_BODY = {
    "orderId": 5001,
    "email": ANNA,
    "items": [{"lineId": 1, "quantity": 1}],
    "reason": "changed-mind",
    "condition": "unopened",
    "refundMethod": "original",
}


class ReturnsPage:
    URL = "/playground/returns"

    def __init__(self, page: Page):
        self.page = page
        self.order_number = page.get_by_label("Order number")
        self.email = page.get_by_label("Email", exact=True)
        self.find_button = page.get_by_role("button", name="Find order")
        self.order_card = page.get_by_test_id("order-card")
        self.reason = page.get_by_label("Reason")
        self.refund = page.get_by_test_id("summary-refund")
        self.track_number = page.get_by_label("Return number")
        self.track_email = page.get_by_label("Email used for the order")
        self.track_button = page.get_by_role("button", name="Track")
        self.track_result = page.get_by_test_id("track-result")
        self.track_error = page.get_by_test_id("track-error")

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

    def set_condition(self, label: str):
        self.page.get_by_label(label, exact=True).check()

    def track(self, number, email: str):
        self.track_number.fill(str(number))
        self.track_email.fill(email)
        self.track_button.click()


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


@pytest.fixture
def created_return(api):
    """A return of the headphones from order 5001, created through the API and cancelled after the test."""
    response = requests.post(f"{api}/returns", json={**REFUND_BODY, "comment": None}, timeout=TIMEOUT)
    assert response.status_code == 201, response.text
    created = response.json()
    yield created
    requests.delete(f"{api}/returns/{created['id']}", params={"email": ANNA}, timeout=TIMEOUT)


def quote(api, **overrides):
    return requests.post(f"{api}/returns/quote", json={**REFUND_BODY, **overrides}, timeout=TIMEOUT)


def test_return_created_through_the_api_is_tracked_in_the_ui(page: Page, created_return):
    returns = ReturnsPage(page).open()

    returns.track(created_return["id"], ANNA)

    expect(returns.track_result).to_have_text(f"Return #{created_return['id']} — requested — refund 2,909 UAH")


def test_another_email_cannot_track_the_return_in_the_ui(page: Page, created_return):
    returns = ReturnsPage(page).open()

    returns.track(created_return["id"], STRANGER)

    expect(returns.track_error).to_contain_text("Return not found")
    expect(returns.track_result).to_have_count(0)


def test_another_email_cannot_read_the_return_through_the_api(api, created_return):
    response = requests.get(f"{api}/returns/{created_return['id']}", params={"email": STRANGER}, timeout=TIMEOUT)

    assert response.status_code == 404, response.text


def test_page_summary_matches_the_api_quote_after_switching_to_opened(page: Page, api):
    expected = quote(api, condition="opened").json()["refund"]
    returns = ReturnsPage(page).open().find_order(5001, ANNA)
    returns.item("Wireless Headphones H1").check()
    returns.reason.select_option("changed-mind")
    expect(returns.refund).to_have_text("2,909 UAH")

    returns.set_condition("Opened")

    expect(returns.refund).to_have_text(f"{expected:,} UAH")
