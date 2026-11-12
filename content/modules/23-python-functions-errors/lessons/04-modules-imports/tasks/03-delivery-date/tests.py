from solution import delivery_date


def test_same_month():
    assert delivery_date("2026-11-12", 3) == "2026-11-15"


def test_month_end():
    """Перехід через кінець місяця: timedelta зробить це сам."""
    assert delivery_date("2026-11-29", 3) == "2026-12-02"


def test_year_end():
    assert delivery_date("2026-12-30", 3) == "2027-01-02"


def test_leap_year():
    """2028 — високосний: після 28 лютого йде 29."""
    assert delivery_date("2028-02-28", 1) == "2028-02-29"


def test_zero_days():
    assert delivery_date("2026-11-12", 0) == "2026-11-12"
