from typing import Literal

import pytest
import requests
from playwright.sync_api import Page, expect
from pydantic import BaseModel, ConfigDict, model_validator

TIMEOUT = 5
ANNA = "anna.koval@example.test"
MAX = "max.bondar@example.test"
OLHA = "olha.melnyk@example.test"
IVAN = "ivan.shevchuk@example.test"
REFUND_BODY = {
    "orderId": 5001,
    "email": ANNA,
    "items": [{"lineId": 1, "quantity": 1}],
    "reason": "changed-mind",
    "condition": "unopened",
    "refundMethod": "original",
}


class QuoteLine(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    lineId: int
    name: str
    price: int
    quantity: int
    value: int


class ReturnQuote(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    orderId: int
    reason: Literal["defective", "wrong-item", "damaged", "changed-mind"]
    condition: Literal["unopened", "opened"]
    refundMethod: Literal["original", "store-credit"]
    items: list[QuoteLine]
    itemsValue: int
    restockingFee: int
    returnShipping: int
    storeCreditBonus: int
    refund: int

    @model_validator(mode="after")
    def refund_adds_up(self):
        expected = self.itemsValue - self.restockingFee - self.returnShipping + self.storeCreditBonus
        assert self.refund == expected, f"refund {self.refund} != {expected}"
        return self


class ReturnsPage:
    URL = "/playground/returns"

    def __init__(self, page: Page):
        self.page = page
        self.order_number = page.get_by_label("Order number")
        self.email = page.get_by_label("Email", exact=True)
        self.find_button = page.get_by_role("button", name="Find order")
        self.order_card = page.get_by_test_id("order-card")
        self.reason = page.get_by_label("Reason")
        self.request_button = page.get_by_role("button", name="Request return")
        self.refund = page.get_by_test_id("summary-refund")
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

    def return_number(self) -> str:
        return self.page.get_by_test_id("return-number").inner_text().lstrip("#")


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


@pytest.fixture
def created_return(api):
    """A return created through the API and cancelled after the test."""
    response = requests.post(f"{api}/returns", json={**REFUND_BODY, "comment": None}, timeout=TIMEOUT)
    assert response.status_code == 201, response.text
    created = response.json()
    yield created
    requests.delete(f"{api}/returns/{created['id']}", params={"email": ANNA}, timeout=TIMEOUT)


@pytest.fixture
def created_returns(api):
    """(return number, email) pairs created through the page; cancelled through the API after the test."""
    created = []
    yield created
    for number, email in created:
        requests.delete(f"{api}/returns/{number}", params={"email": email}, timeout=TIMEOUT)


def quote(api, **overrides):
    return requests.post(f"{api}/returns/quote", json={**REFUND_BODY, **overrides}, timeout=TIMEOUT)


def test_changed_mind_unopened_refund(api):
    response = quote(api)

    assert response.status_code == 200, response.text
    assert ReturnQuote.model_validate(response.json()).refund == 2909


# твій код тут: межі вікна, гроші, валідація сервера, доступ, підтвердження в UI
