from datetime import datetime, timedelta

import pytest

from solution import Promo, PromoError, Quote, find_promo, quote

NOW = datetime(2026, 11, 18, 12, 0)
SPRING = Promo("SPRING10", "percent", 10, min_subtotal=500)
PROMOS = [SPRING, Promo("MINUS200", "fixed", 200)]


def error_code(call):
    with pytest.raises(PromoError) as caught:
        call()
    return caught.value.code


def test_find_ignores_case_and_spaces():
    """Код шукається без урахування регістру й пробілів по краях."""
    assert find_promo(PROMOS, " spring10 ") is SPRING


def test_find_unknown():
    assert error_code(lambda: find_promo(PROMOS, "WINTER")) == "unknown"


def test_no_promo():
    assert quote(1299, None, NOW) == Quote(1299, 0, 1299)


def test_percent_rounds_down():
    """10 % від 1299 = 129,9 → 129: округлення вниз (//), не round()."""
    assert quote(1299, SPRING, NOW) == Quote(1299, 129, 1170)


def test_percent_capped_at_50():
    """Відсоток більше 50 не застосовується: максимум половина суми."""
    assert quote(1000, Promo("HALFPLUS", "percent", 70), NOW) == Quote(1000, 500, 500)


def test_fixed():
    assert quote(899, Promo("MINUS200", "fixed", 200), NOW) == Quote(899, 200, 699)


def test_fixed_never_negative():
    """Фіксована знижка не більша за суму кошика: total не стає від'ємним."""
    assert quote(150, Promo("MINUS200", "fixed", 200), NOW) == Quote(150, 150, 0)


def test_minimum_is_inclusive():
    """Рівно мінімальна сума — уже підходить; на гривню менше — below_minimum."""
    assert quote(500, SPRING, NOW).discount == 50
    assert error_code(lambda: quote(499, SPRING, NOW)) == "below_minimum"


def test_expires_at_the_moment():
    """Код діє до expires_at; у сам момент закінчення — expired (now >= expires_at)."""
    promo = Promo("FLASH", "fixed", 100, expires_at=NOW)
    assert quote(1000, promo, NOW - timedelta(seconds=1)).discount == 100
    assert error_code(lambda: quote(1000, promo, NOW)) == "expired"


def test_used_up_at_the_limit():
    """used == max_uses — ліміт уже вичерпано."""
    assert quote(1000, Promo("ONCE", "fixed", 100, max_uses=1, used=0), NOW).discount == 100
    assert error_code(lambda: quote(1000, Promo("ONCE", "fixed", 100, max_uses=1, used=1), NOW)) == "used_up"


def test_check_order():
    """Порядок перевірок: expired → used_up → below_minimum."""
    everything_wrong = Promo("BAD", "fixed", 100, min_subtotal=5000, expires_at=NOW, max_uses=1, used=1)
    assert error_code(lambda: quote(100, everything_wrong, NOW)) == "expired"
    no_expiry = Promo("BAD", "fixed", 100, min_subtotal=5000, max_uses=1, used=1)
    assert error_code(lambda: quote(100, no_expiry, NOW)) == "used_up"
