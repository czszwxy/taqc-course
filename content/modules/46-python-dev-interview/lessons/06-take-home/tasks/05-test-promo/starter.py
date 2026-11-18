from datetime import datetime, timedelta

import pytest

from subject import Promo, PromoError, Quote, find_promo, quote

NOW = datetime(2026, 11, 18, 12, 0)


def test_percent_discount():
    promo = Promo("SPRING10", "percent", 10)
    assert quote(1000, promo, NOW) == Quote(1000, 100, 900)


# твій код тут
