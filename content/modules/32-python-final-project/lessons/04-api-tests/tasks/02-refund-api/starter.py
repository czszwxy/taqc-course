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


# твій код тут: параметризована таблиця рішень, кількість понад куплену (400), подарункова картка (422)
