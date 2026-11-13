from subject import discount_price


def test_no_discount_keeps_price():
    assert discount_price(500, 0) == 500


def test_discount_is_applied():
    assert discount_price(1000, 15) == 850


def test_fraction_is_dropped():
    assert discount_price(399, 50) == 199


def test_full_discount():
    assert discount_price(500, 100) == 0
