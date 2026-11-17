from solution import find_key_paths

DATA = {
    "id": 1002,
    "order": {"items": [{"sku": "KB-01"}, {"sku": "MS-02", "bundle": {"sku": "PAD"}}]},
}


def test_example():
    assert find_key_paths(DATA, "sku") == [
        "order.items[0].sku",
        "order.items[1].sku",
        "order.items[1].bundle.sku",
    ]


def test_top_level_key():
    assert find_key_paths(DATA, "id") == ["id"]


def test_key_not_found():
    assert find_key_paths(DATA, "price") == []


def test_list_at_the_top():
    """Верхній рівень — список: шлях починається з [0]."""
    assert find_key_paths([{"sku": "A"}, {"x": {"sku": "B"}}], "sku") == ["[0].sku", "[1].x.sku"]


def test_key_inside_its_own_value():
    """Ключ записується до заходу в його значення."""
    assert find_key_paths({"id": {"id": 1}}, "id") == ["id", "id.id"]


def test_lists_inside_lists():
    assert find_key_paths({"grid": [[{"sku": "A"}]]}, "sku") == ["grid[0][0].sku"]


def test_repeated_calls_do_not_share_results():
    """Не накопичуй у змінюваному значенні за замовчуванням: другий виклик — з чистого аркуша."""
    find_key_paths(DATA, "sku")
    assert find_key_paths({"sku": 1}, "sku") == ["sku"]
