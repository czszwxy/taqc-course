import pytest

from errors import PaymentDeclined, TransientError
from solution import retry


class FlakyCall:
    """Падає `failures` разів з TransientError, потім повертає "paid"."""

    def __init__(self, failures, error=TransientError):
        self.failures = failures
        self.error = error
        self.calls = 0

    async def __call__(self):
        self.calls += 1
        if self.calls <= self.failures:
            raise self.error(f"attempt {self.calls}")
        return "paid"


class FakeSleep:
    def __init__(self):
        self.delays = []

    async def __call__(self, seconds):
        self.delays.append(seconds)


@pytest.mark.asyncio
async def test_success_first_time():
    """Успіх з першої спроби — без пауз."""
    call, sleep = FlakyCall(0), FakeSleep()
    assert await retry(call, sleep=sleep) == "paid"
    assert (call.calls, sleep.delays) == (1, [])


@pytest.mark.asyncio
async def test_retries_then_succeeds():
    """Дві тимчасові помилки — паузи 0.1 і 0.5, третя спроба успішна."""
    call, sleep = FlakyCall(2), FakeSleep()
    assert await retry(call, sleep=sleep) == "paid"
    assert (call.calls, sleep.delays) == (3, [0.1, 0.5])


@pytest.mark.asyncio
async def test_gives_up_after_attempts():
    """Спроби скінчились — TransientError летить далі; після останньої спроби паузи немає."""
    call, sleep = FlakyCall(10), FakeSleep()
    with pytest.raises(TransientError, match="attempt 3"):
        await retry(call, sleep=sleep)
    assert (call.calls, sleep.delays) == (3, [0.1, 0.5])


@pytest.mark.asyncio
async def test_last_delay_is_reused():
    """Пауз більше, ніж затримок, — повторюється остання."""
    call, sleep = FlakyCall(4), FakeSleep()
    assert await retry(call, attempts=5, delays=(1, 2), sleep=sleep) == "paid"
    assert sleep.delays == [1, 2, 2, 2]


@pytest.mark.asyncio
async def test_other_errors_are_not_retried():
    """PaymentDeclined — не тимчасова: летить одразу, без повторів і пауз."""
    call, sleep = FlakyCall(1, error=PaymentDeclined), FakeSleep()
    with pytest.raises(PaymentDeclined):
        await retry(call, sleep=sleep)
    assert (call.calls, sleep.delays) == (1, [])


@pytest.mark.asyncio
async def test_single_attempt():
    """attempts=1 — одна спроба без пауз."""
    call, sleep = FlakyCall(1), FakeSleep()
    with pytest.raises(TransientError):
        await retry(call, attempts=1, sleep=sleep)
    assert (call.calls, sleep.delays) == (1, [])


@pytest.mark.asyncio
async def test_attempts_must_be_positive():
    """attempts < 1 — ValueError, call не викликається."""
    call = FlakyCall(0)
    with pytest.raises(ValueError):
        await retry(call, attempts=0, sleep=FakeSleep())
    assert call.calls == 0
