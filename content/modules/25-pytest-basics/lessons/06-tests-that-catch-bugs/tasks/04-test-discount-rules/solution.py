from subject import discount_percent


def test_member_without_promo():
    assert discount_percent(500, True) == 10


def test_promo_below_min_subtotal_is_ignored():
    assert discount_percent(999, False, "SAVE5") == 0


def test_promo_at_min_subtotal_applies():
    assert discount_percent(1000, False, "SAVE5") == 5


def test_member_and_promo_add_up():
    assert discount_percent(2000, True, "SAVE5") == 15


def test_total_is_capped_at_25():
    assert discount_percent(2000, True, "SAVE20") == 25


def test_unknown_promo_is_ignored():
    assert discount_percent(2000, False, "BAD") == 0
