from subject import discount_price


def test_no_discount_keeps_price():
    assert discount_price(500, 0) == 500


# твій код тут
