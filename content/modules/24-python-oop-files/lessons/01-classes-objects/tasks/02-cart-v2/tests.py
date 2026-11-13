from solution import Wishlist


def make_wishlist():
    wishlist = Wishlist("olena")
    wishlist.add("Mouse")
    wishlist.add("Mouse")
    wishlist.add("Cable")
    return wishlist


def test_ignores_duplicates():
    assert make_wishlist().count() == 2


def test_has_ignores_case():
    """Порівнюй без регістру: lower() з обох боків."""
    wishlist = make_wishlist()
    assert wishlist.has("mouse") is True
    assert wishlist.has("HUB") is False


def test_remove():
    wishlist = make_wishlist()
    wishlist.remove("Cable")
    assert wishlist.count() == 1


def test_remove_missing_does_not_fail():
    """Відсутній товар — нічого не робити, без ValueError."""
    wishlist = make_wishlist()
    wishlist.remove("Hub")
    assert wishlist.count() == 2


def test_independent_wishlists():
    """self.products у __init__ — у кожного списку свій стан."""
    make_wishlist()
    assert Wishlist("bohdan").count() == 0
