from typing import Literal

import pytest
import requests
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator

TIMEOUT = 5
USER = {"email": "qa@gadgetly.test", "password": "Test1234"}
STRICT = ConfigDict(extra="forbid", strict=True)


class Product(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    name: str
    category: str
    price: int = Field(gt=0)
    rating: float
    inStock: bool


class User(BaseModel):
    model_config = STRICT

    id: int
    email: str
    name: str
    role: Literal["customer"]


class LoginResponse(BaseModel):
    model_config = STRICT

    token: str
    tokenType: Literal["Bearer"]
    expiresIn: int = Field(gt=0)
    user: User


class Order(BaseModel):
    model_config = STRICT

    id: int
    userId: int
    productId: int
    quantity: int = Field(ge=1, le=10)
    unitPrice: int = Field(gt=0)
    total: int
    status: Literal["created", "paid"]
    createdAt: str

    @model_validator(mode="after")
    def total_is_price_times_quantity(self):
        if self.total != self.unitPrice * self.quantity:
            raise ValueError(f"total {self.total} != {self.unitPrice} * {self.quantity}")
        return self


@pytest.fixture(scope="session")
def api(base_url):
    return f"{base_url}/api"


@pytest.fixture(scope="session")
def auth(api):
    response = requests.post(f"{api}/auth/login", json=USER, timeout=TIMEOUT)
    response.raise_for_status()
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_every_product_matches_the_contract(api):
    body = requests.get(f"{api}/products", params={"limit": 50}, timeout=TIMEOUT).json()

    products = TypeAdapter(list[Product]).validate_python(body["items"])

    assert len(products) == body["total"]


def test_login_matches_the_contract(api):
    response = requests.post(f"{api}/auth/login", json=USER, timeout=TIMEOUT)

    assert response.status_code == 200
    login = LoginResponse.model_validate(response.json())
    assert login.user.email == USER["email"]


def test_new_order_matches_the_contract(api, auth):
    response = requests.post(f"{api}/orders", json={"productId": 1, "quantity": 2}, headers=auth, timeout=TIMEOUT)
    try:
        assert response.status_code == 201, response.text
        Order.model_validate(response.json())
    finally:
        requests.delete(f"{api}/orders/{response.json()['id']}", headers=auth, timeout=TIMEOUT)


def test_patched_order_matches_the_contract(api, auth):
    created = requests.post(f"{api}/orders", json={"productId": 1, "quantity": 2}, headers=auth, timeout=TIMEOUT).json()
    try:
        response = requests.patch(f"{api}/orders/{created['id']}", json={"quantity": 3}, headers=auth, timeout=TIMEOUT)

        assert response.status_code == 200, response.text
        order = Order.model_validate(response.json())
        assert order.quantity == 3
    finally:
        requests.delete(f"{api}/orders/{created['id']}", headers=auth, timeout=TIMEOUT)
