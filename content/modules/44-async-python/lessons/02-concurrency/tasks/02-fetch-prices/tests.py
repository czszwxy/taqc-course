import pytest

from fakes import PriceService, UnknownProduct
from solution import fetch_prices


@pytest.mark.asyncio
async def test_prices():
    """Словник «sku → ціна»."""
    assert await fetch_prices(PriceService(), ["MOUSE-01", "CABLE-C1"]) == {"MOUSE-01": 899, "CABLE-C1": 299}


@pytest.mark.asyncio
async def test_all_requests_at_once():
    """Усі запити одночасно: пік одночасних викликів дорівнює кількості товарів (gather, а не цикл з await)."""
    service = PriceService()
    await fetch_prices(service, ["MOUSE-01", "CABLE-C1", "STAND-01", "HUB-01"])
    assert service.peak == 4


@pytest.mark.asyncio
async def test_order_follows_skus_not_speed():
    """Ключі — у порядку skus, навіть якщо перший товар відповідає найповільніше."""
    service = PriceService(delays={"STAND-01": 0.08, "CAM-01": 0.01})
    result = await fetch_prices(service, ["STAND-01", "MOUSE-01", "CAM-01"])
    assert list(result) == ["STAND-01", "MOUSE-01", "CAM-01"]


@pytest.mark.asyncio
async def test_duplicates_asked_once():
    """Повторений sku — один виклик."""
    service = PriceService()
    result = await fetch_prices(service, ["MOUSE-01", "CABLE-C1", "MOUSE-01"])
    assert result == {"MOUSE-01": 899, "CABLE-C1": 299}
    assert sorted(service.calls) == ["CABLE-C1", "MOUSE-01"]


@pytest.mark.asyncio
async def test_empty():
    """Порожній список — {} без викликів."""
    service = PriceService()
    assert await fetch_prices(service, []) == {}
    assert service.calls == []


@pytest.mark.asyncio
async def test_unknown_product_propagates():
    """UnknownProduct летить далі."""
    with pytest.raises(UnknownProduct):
        await fetch_prices(PriceService(), ["MOUSE-01", "NOPE-1"])
