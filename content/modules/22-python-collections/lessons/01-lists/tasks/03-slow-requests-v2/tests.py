from solution import with_prefix

NAMES = ["test_login_ok", "test_cart_add", "test_login_locked"]


def test_selects_matching():
    assert with_prefix(NAMES, "test_login") == ["test_login_ok", "test_login_locked"]


def test_prefix_only_at_start():
    """Перевіряй початок назви (startswith), а не входження будь-де."""
    assert with_prefix(["test_cart_login", "test_login"], "test_login") == ["test_login"]


def test_nothing_matches():
    assert with_prefix(NAMES, "test_search") == []
