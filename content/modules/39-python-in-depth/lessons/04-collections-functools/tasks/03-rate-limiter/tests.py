import pytest

from solution import RateLimiter


def test_requests_over_the_limit_are_rejected():
    """Менше limit дозволених запитів у вікні — True, інакше False."""
    limiter = RateLimiter(limit=3, window=60)
    assert [limiter.allow(t) for t in (0, 10, 20, 30)] == [True, True, True, False]


def test_old_requests_leave_the_window():
    """Запит у момент 0 поза вікном, коли now - 0 >= window."""
    limiter = RateLimiter(limit=3, window=60)
    for t in (0, 10, 20):
        limiter.allow(t)
    assert limiter.allow(59) is False
    assert limiter.allow(60) is True


def test_rejected_requests_do_not_take_a_slot():
    """Відхилений запит не записуй — інакше клієнт, що продовжує стукати, ніколи не отримає доступ."""
    limiter = RateLimiter(limit=1, window=10)
    assert limiter.allow(0) is True
    assert limiter.allow(5) is False
    assert limiter.allow(9) is False
    assert limiter.allow(10) is True


def test_several_old_requests_expire_at_once():
    """Прибирай з лівого боку всі застарілі запити, а не лише один (while, а не if)."""
    limiter = RateLimiter(limit=3, window=5)
    for t in (0, 1, 2):
        limiter.allow(t)
    assert [limiter.allow(t) for t in (10, 10, 10, 10)] == [True, True, True, False]


def test_limit_below_one_is_rejected():
    with pytest.raises(ValueError, match="limit must be at least 1"):
        RateLimiter(limit=0, window=60)
