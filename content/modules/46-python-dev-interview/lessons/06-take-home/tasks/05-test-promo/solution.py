from datetime import datetime, timedelta

import pytest

from subject import Promo, PromoError, Quote, find_promo, quote

NOW = datetime(2026, 11, 18, 12, 0)


def error_code(call):
    with pytest.raises(PromoError) as caught:
        call()
    return caught.value.code


def test_percent_discount():
    promo = Promo("SPRING10", "percent", 10)
    assert quote(1000, promo, NOW) == Quote(1000, 100, 900)


def test_percent_rounds_down():
    assert quote(1299, Promo("SPRING10", "percent", 10), NOW) == Quote(1299, 129, 1170)


def test_percent_capped_at_half():
    assert quote(1000, Promo("BIG", "percent", 70), NOW).discount == 500


def test_fixed_not_more_than_subtotal():
    assert quote(150, Promo("MINUS200", "fixed", 200), NOW) == Quote(150, 150, 0)


def test_minimum_boundary():
    promo = Promo("SPRING10", "percent", 10, min_subtotal=500)
    assert quote(500, promo, NOW).discount == 50
    assert error_code(lambda: quote(499, promo, NOW)) == "below_minimum"


def test_expiry_boundary():
    promo = Promo("FLASH", "fixed", 100, expires_at=NOW)
    assert quote(1000, promo, NOW - timedelta(seconds=1)).discount == 100
    assert error_code(lambda: quote(1000, promo, NOW)) == "expired"


def test_uses_limit_boundary():
    assert quote(1000, Promo("ONCE", "fixed", 100, max_uses=1, used=0), NOW).discount == 100
    assert error_code(lambda: quote(1000, Promo("ONCE", "fixed", 100, max_uses=1, used=1), NOW)) == "used_up"


def test_find_ignores_case_and_spaces():
    spring = Promo("SPRING10", "percent", 10)
    assert find_promo([spring], " spring10 ") is spring
    assert error_code(lambda: find_promo([spring], "WINTER")) == "unknown"
