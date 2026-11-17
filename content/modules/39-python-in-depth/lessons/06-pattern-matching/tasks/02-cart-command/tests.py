from solution import run


def test_add_one():
    cart = {}
    assert run(["add", "MS-02"], cart) == "added 1 x MS-02"
    assert cart == {"MS-02": 1}


def test_add_a_quantity():
    """Окремий case з трьома словами й умовою: if qty.isdigit() and int(qty) > 0."""
    cart = {"KB-01": 1}
    assert run(["add", "KB-01", "2"], cart) == "added 2 x KB-01"
    assert cart == {"KB-01": 3}


def test_add_with_a_bad_quantity_is_unknown():
    """Нечислова або нульова кількість — не підходить під add, отже 'unknown command: ...'."""
    cart = {}
    assert run(["add", "KB-01", "lots"], cart) == "unknown command: add KB-01 lots"
    assert run(["add", "KB-01", "0"], cart) == "unknown command: add KB-01 0"
    assert cart == {}


def test_remove_several_counts_only_removed():
    """case [\"remove\", sku, *more] — прибери кожен; рахуй лише ті, що справді були в кошику."""
    cart = {"KB-01": 2, "MS-02": 1, "HD-07": 1}
    assert run(["remove", "KB-01", "XX-99", "HD-07"], cart) == "removed 2"
    assert cart == {"MS-02": 1}


def test_remove_without_sku_is_unknown():
    """Після remove потрібен хоча б один sku."""
    assert run(["remove"], {"KB-01": 1}) == "unknown command: remove"


def test_clear():
    cart = {"KB-01": 2}
    assert run(["clear"], cart) == "cart cleared"
    assert cart == {}


def test_show_sorted():
    """sku за абеткою: sorted(cart.items())."""
    assert run(["show"], {"MS-02": 1, "KB-01": 2}) == "KB-01 x 2, MS-02 x 1"


def test_show_empty():
    assert run(["show"], {}) == "cart is empty"


def test_no_words():
    """Окремий case [] перед case _."""
    assert run([], {}) == "no command"


def test_unknown_command():
    assert run(["checkout", "now"], {}) == "unknown command: checkout now"


def test_show_with_extra_words_is_unknown():
    """[\"show\"] — рівно одне слово."""
    assert run(["show", "all"], {}) == "unknown command: show all"
