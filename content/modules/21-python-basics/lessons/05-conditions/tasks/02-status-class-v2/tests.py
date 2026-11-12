from solution import discount_tier


def test_negative():
    assert discount_tier(-1) == "invalid"


def test_none_range():
    """0–999 — none: межі 0 і 999."""
    assert discount_tier(0) == "none"
    assert discount_tier(999) == "none"


def test_silver_boundaries():
    """1000 — вже silver, 4999 — ще silver."""
    assert discount_tier(1000) == "silver"
    assert discount_tier(4999) == "silver"


def test_gold():
    """5000 і більше — gold."""
    assert discount_tier(5000) == "gold"
    assert discount_tier(25000) == "gold"
