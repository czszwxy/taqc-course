from typing import Literal

import pytest
import requests
from pydantic import BaseModel, ConfigDict, model_validator

TIMEOUT = 5
REFUND_BODY = {
    "orderId": 5001,
    "email": "anna.koval@example.test",
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
        assert self.itemsValue == sum(line.value for line in self.items)
        expected = self.itemsValue - self.restockingFee - self.returnShipping + self.storeCreditBonus
        assert self.refund == expected, f"refund {self.refund} != {expected}"
        return self


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


def quote(api, **overrides):
    return requests.post(f"{api}/returns/quote", json={**REFUND_BODY, **overrides}, timeout=TIMEOUT)


def test_changed_mind_unopened_refund(api):
    response = quote(api)

    assert response.status_code == 200, response.text
    body = ReturnQuote.model_validate(response.json())
    assert (body.restockingFee, body.returnShipping, body.refund) == (0, 90, 2909)


@pytest.mark.parametrize(
    "reason, condition, method, fee, shipping, bonus, refund",
    [
        ("changed-mind", "unopened", "original", 0, 90, 0, 2909),
        ("changed-mind", "opened", "original", 449, 90, 0, 2460),
        ("changed-mind", "unopened", "store-credit", 0, 90, 290, 3199),
        ("changed-mind", "opened", "store-credit", 449, 90, 246, 2706),
        ("defective", "opened", "original", 0, 0, 0, 2999),
        ("defective", "unopened", "store-credit", 0, 0, 299, 3298),
        ("wrong-item", "opened", "store-credit", 0, 0, 299, 3298),
        ("damaged", "opened", "original", 0, 0, 0, 2999),
    ],
)
def test_refund_decision_table(api, reason, condition, method, fee, shipping, bonus, refund):
    response = quote(api, reason=reason, condition=condition, refundMethod=method)

    assert response.status_code == 200, response.text
    body = ReturnQuote.model_validate(response.json())
    assert (body.restockingFee, body.returnShipping, body.storeCreditBonus, body.refund) == (fee, shipping, bonus, refund)


def test_quantity_above_the_bought_quantity_is_rejected(api):
    response = quote(api, items=[{"lineId": 2, "quantity": 4}])

    assert response.status_code == 400, response.text


def test_gift_card_cannot_be_returned(api):
    response = quote(api, items=[{"lineId": 3, "quantity": 1}])

    assert response.status_code == 422, response.text
    assert response.json()["error"] == "Gift cards cannot be returned"
