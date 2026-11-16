import pytest

from solution import retry


def flaky(failures, error=ConnectionError, result="ok"):
    """A function that fails `failures` times, then returns `result`; counts its calls."""
    calls = []

    def call(*args, **kwargs):
        calls.append((args, kwargs))
        if len(calls) <= failures:
            raise error(f"attempt {len(calls)} failed")
        return result

    return call, calls


def test_returns_value_on_first_success():
    func, calls = flaky(0)
    assert retry(times=3)(func)() == "ok"
    assert len(calls) == 1


def test_retries_until_success():
    """Дві невдачі, третя спроба вдала: результат третьої, рівно 3 виклики."""
    func, calls = flaky(2)
    assert retry(times=3, exceptions=(ConnectionError,))(func)() == "ok"
    assert len(calls) == 3


def test_raises_last_error_after_all_attempts():
    """Усі спроби впали — підніми виняток ОСТАННЬОЇ спроби, викликів рівно times."""
    func, calls = flaky(5)
    with pytest.raises(ConnectionError, match="attempt 3 failed"):
        retry(times=3, exceptions=(ConnectionError,))(func)()
    assert len(calls) == 3


def test_other_exceptions_are_not_retried():
    """Виняток не з exceptions — одразу наверх, без повторів: інакше повтор ховає справжні баги."""
    func, calls = flaky(1, error=ValueError)
    with pytest.raises(ValueError):
        retry(times=3, exceptions=(ConnectionError,))(func)()
    assert len(calls) == 1


def test_default_retries_any_exception():
    func, calls = flaky(1, error=KeyError)
    assert retry(times=2)(func)() == "ok"
    assert len(calls) == 2


def test_arguments_are_passed():
    """wrapper(*args, **kwargs) має передати все у функцію."""
    func, calls = flaky(0)
    retry(times=2)(func)(1002, status="paid")
    assert calls == [((1002,), {"status": "paid"})]


def test_works_with_decorator_syntax():
    @retry(times=2)
    def order_status(order_id):
        return f"Order #{order_id} is paid"

    assert order_status(1002) == "Order #1002 is paid"


def test_keeps_name_and_docstring():
    """@functools.wraps(func) зберігає __name__ і __doc__ — інакше у звітах усі функції звуться wrapper."""

    @retry(times=2)
    def get_status(order_id):
        """Reads the order status from the API."""
        return order_id

    assert get_status.__name__ == "get_status"
    assert get_status.__doc__ == "Reads the order status from the API."


def test_times_must_be_positive():
    """retry(0) — помилка налаштування: ValueError одразу, ще до декорування функції."""
    with pytest.raises(ValueError):
        retry(0)
