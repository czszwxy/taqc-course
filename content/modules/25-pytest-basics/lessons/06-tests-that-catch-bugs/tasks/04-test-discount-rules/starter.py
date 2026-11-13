from subject import discount_percent


def test_member_without_promo():
    assert discount_percent(500, True) == 10


# твій код тут
