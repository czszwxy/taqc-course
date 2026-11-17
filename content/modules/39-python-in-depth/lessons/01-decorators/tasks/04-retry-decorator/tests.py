import pytest

from solution import retry


def flaky(failures, error=ConnectionError):
    """A fake service call: raises `error` `failures` times, then returns 'ok'. calls counts every call."""
    calls = []

    def call(*args, **kwargs):
        calls.append((args, kwargs))
        if len(calls) <= failures:
            raise error(f"attempt {len(calls)} failed")
        return "ok"

    return call, calls


def test_succeeds_after_temporary_failures():
    """Повторюй, доки виклик не вдасться, і поверни його результат."""
    call, calls = flaky(2)
    assert retry(3, exceptions=(ConnectionError,))(call)() == "ok"
    assert len(calls) == 3


def test_stops_after_the_first_success():
    """Після успіху — одразу return, жодних зайвих викликів."""
    call, calls = flaky(0)
    retry(5)(call)()
    assert len(calls) == 1


def test_raises_the_last_error_after_all_attempts():
    """Після times невдалих спроб кинь останній виняток далі (голий raise)."""
    call, calls = flaky(10)
    with pytest.raises(ConnectionError, match="attempt 3 failed"):
        retry(3, exceptions=(ConnectionError,))(call)()
    assert len(calls) == 3


def test_other_exceptions_are_not_retried():
    """Ловиться лише except exceptions: інші типи летять одразу, без повторів."""
    call, calls = flaky(5, error=KeyError)
    with pytest.raises(KeyError):
        retry(3, exceptions=(ConnectionError,))(call)()
    assert len(calls) == 1


def test_default_retries_any_exception():
    """За замовчуванням exceptions=(Exception,) — повторюється будь-який виняток."""
    call, calls = flaky(1, error=TimeoutError)
    assert retry(2)(call)() == "ok"


def test_times_one_means_no_retry():
    """times — загальна кількість спроб, не кількість повторів."""
    call, calls = flaky(1)
    with pytest.raises(ConnectionError):
        retry(1)(call)()
    assert len(calls) == 1


def test_times_below_one_is_rejected_immediately():
    """Перевір times у самій retry(...), ще до декорування: raise ValueError(\"times must be at least 1\")."""
    with pytest.raises(ValueError, match="times must be at least 1"):
        retry(0)


def test_arguments_and_name_are_kept():
    """Обгортка передає аргументи далі, а @wraps(func) зберігає ім'я."""

    @retry(2)
    def get_user(user_id, *, fields=None):
        return {"id": user_id, "fields": fields}

    assert get_user(42, fields=["email"]) == {"id": 42, "fields": ["email"]}
    assert get_user.__name__ == "get_user"
