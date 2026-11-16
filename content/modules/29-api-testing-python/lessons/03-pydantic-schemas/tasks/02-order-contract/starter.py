from typing import Literal

import pytest
import requests
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator

TIMEOUT = 5
USER = {"email": "qa@gadgetly.test", "password": "Test1234"}


class Product(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    id: int
    name: str
    category: str
    price: int = Field(gt=0)
    rating: float
    inStock: bool


# твій код тут: моделі User, LoginResponse і Order (з правилом total == unitPrice * quantity)


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


# твій код тут: тести входу, нового замовлення і PATCH
