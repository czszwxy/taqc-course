from solution import add_unique


def test_adds_new_item():
    assert add_unique(["smoke", "login"], "cart") == ["smoke", "login", "cart"]


def test_skips_existing_item():
    """Елемент уже є — список без змін (без дубліката)."""
    assert add_unique(["smoke", "login"], "smoke") == ["smoke", "login"]


def test_does_not_change_input():
    """Не змінюй вхідний список — працюй з копією: items.copy()."""
    tags = ["smoke", "login"]
    add_unique(tags, "cart")
    assert tags == ["smoke", "login"]


def test_returns_new_list():
    """Навіть коли нічого не додано, поверни копію, а не той самий список."""
    tags = ["smoke"]
    assert add_unique(tags, "smoke") is not tags


def test_empty():
    assert add_unique([], "smoke") == ["smoke"]
