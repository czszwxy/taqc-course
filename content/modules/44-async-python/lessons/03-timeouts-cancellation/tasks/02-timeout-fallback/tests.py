import pytest

from fakes import StockService, UnknownProduct
from solution import stock_or_none, stock_report


@pytest.mark.asyncio
async def test_fast_answer():
    """Швидка відповідь — залишок."""
    assert await stock_or_none(StockService(), "MOUSE-01", timeout=0.2) == 12


@pytest.mark.asyncio
async def test_slow_answer_is_none():
    """Не встиг за timeout — None."""
    assert await stock_or_none(StockService(), "SLOW-01", timeout=0.05) is None


@pytest.mark.asyncio
async def test_slow_call_is_cancelled():
    """Повільний виклик скасовано (asyncio.timeout скасовує операцію), він не працює далі."""
    service = StockService()
    await stock_or_none(service, "SLOW-01", timeout=0.05)
    assert service.cancelled == ["SLOW-01"]
    assert service.in_flight == 0


@pytest.mark.asyncio
async def test_other_errors_are_not_hidden():
    """UnknownProduct — не тайм-аут: летить далі, а не перетворюється на None."""
    with pytest.raises(UnknownProduct):
        await stock_or_none(StockService(), "NOPE-1", timeout=0.2)


@pytest.mark.asyncio
async def test_report():
    """Звіт: залишки й None для повільних, у порядку skus."""
    report = await stock_report(StockService(), ["SLOW-02", "MOUSE-01", "CABLE-C1", "SLOW-01"], timeout=0.05)
    assert list(report.items()) == [("SLOW-02", None), ("MOUSE-01", 12), ("CABLE-C1", 40), ("SLOW-01", None)]


@pytest.mark.asyncio
async def test_report_is_concurrent():
    """Усі запити звіту одночасно: пік = кількість товарів."""
    service = StockService()
    await stock_report(service, ["SLOW-01", "SLOW-02", "MOUSE-01"], timeout=0.05)
    assert service.peak == 3
    assert sorted(service.cancelled) == ["SLOW-01", "SLOW-02"]
