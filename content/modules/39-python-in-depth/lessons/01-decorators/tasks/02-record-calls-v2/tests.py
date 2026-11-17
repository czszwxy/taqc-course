import pytest

from solution import count_calls


def make_send_email():
    @count_calls
    def send_email(to, subject):
        """Send one email."""
        return f"sent to {to}"

    return send_email


def test_starts_at_zero():
    """Лічильник має існувати одразу після декорування: wrapper.count = 0 перед return wrapper."""
    assert make_send_email().count == 0


def test_counts_every_call_and_returns_the_result():
    """Обгортка збільшує count і повертає результат оригіналу."""
    send_email = make_send_email()
    assert send_email("anna@example.com", "Hi") == "sent to anna@example.com"
    send_email(to="ivan@example.com", subject="Hi")
    assert send_email.count == 2


def test_each_function_has_its_own_counter():
    """Кожен виклик count_calls створює нову обгортку зі своїм лічильником."""
    first = make_send_email()
    second = make_send_email()
    first("a@example.com", "x")
    assert second.count == 0


def test_name_and_docstring_are_kept():
    """Постав @wraps(func) над обгорткою."""
    send_email = make_send_email()
    assert send_email.__name__ == "send_email"
    assert send_email.__doc__ == "Send one email."


def test_a_failed_call_is_counted():
    """Збільшуй count до виклику func — тоді рахуються і виклики, що кинули виняток."""

    @count_calls
    def fail():
        raise RuntimeError("boom")

    with pytest.raises(RuntimeError):
        fail()
    assert fail.count == 1
