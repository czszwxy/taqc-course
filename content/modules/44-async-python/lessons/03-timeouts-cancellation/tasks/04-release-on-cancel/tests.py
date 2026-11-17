import asyncio

import pytest

from fakes import Gateway, PaymentDeclined
from solution import checkout


@pytest.mark.asyncio
async def test_success_keeps_the_reservation():
    """Успіх — квитанція, бронь не знято."""
    gateway = Gateway()
    assert await checkout(gateway, 7) == "receipt-7"
    assert (gateway.reserved, gateway.released) == (["R-7"], [])


@pytest.mark.asyncio
async def test_declined_releases_and_raises():
    """Відмова оплати — бронь знято, PaymentDeclined летить далі."""
    gateway = Gateway(decline=True)
    with pytest.raises(PaymentDeclined):
        await checkout(gateway, 8)
    assert gateway.released == ["R-8"]


@pytest.mark.asyncio
async def test_cancelled_releases():
    """Задачу скасували посеред оплати — бронь знято (except Exception тут не допоможе)."""
    gateway = Gateway(pay_delay=1)
    task = asyncio.create_task(checkout(gateway, 9))
    await asyncio.sleep(0.02)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert gateway.released == ["R-9"]


@pytest.mark.asyncio
async def test_cancellation_is_not_swallowed():
    """Скасована задача завершується як скасована: task.cancelled() — True."""
    gateway = Gateway(pay_delay=1)
    task = asyncio.create_task(checkout(gateway, 10))
    await asyncio.sleep(0.02)
    task.cancel()
    await asyncio.gather(task, return_exceptions=True)
    assert task.cancelled()
    assert gateway.paid == []


@pytest.mark.asyncio
async def test_timeout_releases():
    """Тайм-аут зверху теж скасовує оплату — і бронь знімається."""
    gateway = Gateway(pay_delay=1)
    with pytest.raises(TimeoutError):
        async with asyncio.timeout(0.05):
            await checkout(gateway, 11)
    assert gateway.released == ["R-11"]
