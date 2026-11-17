import asyncio

import pytest

from solution import process_orders


class Handler:
    """Фейкова обробка: рахує одночасні виклики; id з failing падають; час залежить від id (порядок завершення змішаний)."""

    def __init__(self, failing=()):
        self.failing = set(failing)
        self.calls = []
        self.in_flight = 0
        self.peak = 0

    async def __call__(self, order_id):
        self.calls.append(order_id)
        self.in_flight += 1
        self.peak = max(self.peak, self.in_flight)
        try:
            await asyncio.sleep(0.005 * (order_id % 4 + 1))
            if order_id in self.failing:
                raise RuntimeError(f"order {order_id}: address is missing")
            return f"shipped-{order_id}"
        finally:
            self.in_flight -= 1


ORDERS = list(range(1, 13))


def other_tasks():
    return [task for task in asyncio.all_tasks() if task is not asyncio.current_task()]


@pytest.mark.asyncio
async def test_all_processed_in_input_order():
    """Усі результати, у порядку order_ids (а не завершення)."""
    results, errors = await process_orders(ORDERS, Handler(), workers=3)
    assert list(results.items()) == [(order_id, f"shipped-{order_id}") for order_id in ORDERS]
    assert errors == {}


@pytest.mark.asyncio
async def test_peak_equals_workers():
    """Одночасно рівно workers обробок — це пул, а не цикл і не gather на всі."""
    handler = Handler()
    await process_orders(ORDERS, handler, workers=3)
    assert handler.peak == 3


@pytest.mark.asyncio
async def test_each_order_once():
    """Кожне замовлення — рівно один раз."""
    handler = Handler()
    await process_orders(ORDERS, handler, workers=4)
    assert sorted(handler.calls) == ORDERS


@pytest.mark.asyncio
async def test_errors_are_collected():
    """Помилки — у errors як str(помилки), інші замовлення обробляються далі."""
    results, errors = await process_orders(ORDERS, Handler(failing={2, 9}), workers=3)
    assert errors == {2: "order 2: address is missing", 9: "order 9: address is missing"}
    assert 2 not in results and len(results) == 10


@pytest.mark.asyncio
async def test_no_background_tasks_left():
    """Після повернення не лишається фонових задач: воркерів зупинено і дочекано."""
    await process_orders(ORDERS, Handler(), workers=3)
    assert other_tasks() == []


@pytest.mark.asyncio
async def test_more_workers_than_orders():
    """Воркерів більше, ніж замовлень, — пік = кількість замовлень; фонових задач не лишається."""
    handler = Handler()
    results, _ = await process_orders([5, 6], handler, workers=8)
    assert (len(results), handler.peak) == (2, 2)
    assert other_tasks() == []


@pytest.mark.asyncio
async def test_empty():
    """Немає замовлень — ({}, {}) і жодних задач."""
    assert await process_orders([], Handler(), workers=2) == ({}, {})
    assert other_tasks() == []


@pytest.mark.asyncio
async def test_workers_must_be_positive():
    """workers < 1 — ValueError."""
    with pytest.raises(ValueError):
        await process_orders(ORDERS, Handler(), workers=0)
