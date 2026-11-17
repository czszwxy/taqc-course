import asyncio
import inspect

import pytest

from prices import PriceService, UnknownProduct
from solution import cart_total, checkout_total


def test_cart_total_is_a_coroutine_function():
    """cart_total оголошена через async def."""
    assert inspect.iscoroutinefunction(cart_total)


def test_cart_total():
    """Сума ціна × кількість: 899 × 2 + 299."""
    assert asyncio.run(cart_total(PriceService(), {"MOUSE-01": 2, "CABLE-C1": 1})) == 2097


def test_every_product_is_asked_once():
    """Кожен товар — один виклик get_price (await для кожного)."""
    service = PriceService()
    asyncio.run(cart_total(service, {"MOUSE-01": 1, "STAND-01": 3}))
    assert sorted(service.calls) == ["MOUSE-01", "STAND-01"]


def test_empty_cart():
    """Порожній кошик — 0 і жодного виклику."""
    service = PriceService()
    assert asyncio.run(cart_total(service, {})) == 0
    assert service.calls == []


def test_unknown_product_propagates():
    """Невідомий товар — UnknownProduct летить з cart_total."""
    with pytest.raises(UnknownProduct):
        asyncio.run(cart_total(PriceService(), {"NOPE-1": 1}))


def test_uses_the_given_service():
    """cart_total бере ціни з переданого сервісу, а не з власного."""
    service = PriceService(prices={"MOUSE-01": 100})
    assert asyncio.run(cart_total(service, {"MOUSE-01": 3})) == 300


def test_checkout_total_is_sync():
    """checkout_total — звичайна функція, повертає число (asyncio.run всередині)."""
    assert not inspect.iscoroutinefunction(checkout_total)
    assert checkout_total({"MOUSE-01": 2, "CABLE-C1": 1}) == 2097
