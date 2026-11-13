from subject import can_open


def test_customer_opens_account(make_user):
    assert can_open(make_user(), "/account") is True


# твій код тут
