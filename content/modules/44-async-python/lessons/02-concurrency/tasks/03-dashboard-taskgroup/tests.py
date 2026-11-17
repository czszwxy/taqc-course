import asyncio

import pytest

from fakes import ApiError, DashboardApi
from solution import load_dashboard


@pytest.mark.asyncio
async def test_dashboard():
    """Усі три блоки в словнику."""
    assert await load_dashboard(DashboardApi()) == {"orders": 42, "stock": 1310, "revenue": 128_500}


@pytest.mark.asyncio
async def test_blocks_load_together():
    """Блоки вантажаться одночасно: пік 3."""
    api = DashboardApi()
    await load_dashboard(api)
    assert api.peak == 3


@pytest.mark.asyncio
async def test_failure_raises_exception_group():
    """Блок упав — з функції вилітає ExceptionGroup з ApiError (так поводиться TaskGroup)."""
    with pytest.raises(ExceptionGroup) as caught:
        await load_dashboard(DashboardApi(failing={"stock"}))
    assert [type(e) for e in caught.value.exceptions] == [ApiError]


@pytest.mark.asyncio
async def test_slow_blocks_are_cancelled():
    """stock падає швидко — повільні orders і revenue скасовуються, а не працюють далі у фоні."""
    api = DashboardApi(delays={"orders": 0.5, "revenue": 0.5, "stock": 0.01}, failing={"stock"})
    with pytest.raises(ExceptionGroup):
        await load_dashboard(api)
    assert sorted(api.cancelled) == ["orders", "revenue"]
    assert api.in_flight == 0


@pytest.mark.asyncio
async def test_handled_with_except_star():
    """Помилку можна обробити через except* ApiError."""
    try:
        await load_dashboard(DashboardApi(failing={"revenue"}))
    except* ApiError as group:
        assert "revenue is unavailable" in str(group.exceptions[0])
    else:
        pytest.fail("load_dashboard must raise")
