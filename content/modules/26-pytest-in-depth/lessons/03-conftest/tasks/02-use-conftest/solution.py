from subject import can_open


def test_customer_opens_account(make_user):
    assert can_open(make_user(), "/account") is True


def test_guest_opens_public_page():
    assert can_open(None, "/catalog") is True


def test_guest_cannot_open_account():
    assert can_open(None, "/account") is False


def test_inactive_user_cannot_open_account(make_user):
    assert can_open(make_user(active=False), "/account") is False


def test_customer_cannot_open_admin(make_user):
    assert can_open(make_user(), "/admin") is False


def test_admin_opens_admin(make_user):
    assert can_open(make_user(role="admin"), "/admin/users") is True


def test_admin_opens_regular_page(make_user):
    assert can_open(make_user(role="admin"), "/account") is True
