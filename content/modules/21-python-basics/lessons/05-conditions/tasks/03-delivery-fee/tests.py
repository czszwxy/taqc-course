from solution import delivery_fee


def test_pickup_and_post():
    assert delivery_fee(5500, "pickup") == 0
    assert delivery_fee(5500, "post") == 70


def test_courier_below_threshold():
    assert delivery_fee(9999, "courier") == 150


def test_courier_at_threshold():
    """Рівно 10 000 — уже безкоштовно: >=, а не >."""
    assert delivery_fee(10000, "courier") == 0


def test_post_is_never_free():
    """Безкоштовна межа — лише для courier."""
    assert delivery_fee(20000, "post") == 70


def test_unknown_method():
    """Невідомий спосіб доставки — None."""
    assert delivery_fee(5500, "drone") is None
