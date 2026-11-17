from solution import category_path

CATALOG = {
    "name": "All",
    "children": [
        {"name": "Audio", "children": [{"name": "Headphones"}, {"name": "Accessories"}]},
        {"name": "Computers", "children": [{"name": "Laptops", "children": [{"name": "Accessories"}]}]},
    ],
}


def test_nested_category():
    assert category_path(CATALOG, "Laptops") == ["All", "Computers", "Laptops"]


def test_root():
    assert category_path(CATALOG, "All") == ["All"]


def test_first_match_in_depth_first_order():
    """Поверни шлях одразу, щойно знайшов його в першій гілці."""
    assert category_path(CATALOG, "Accessories") == ["All", "Audio", "Accessories"]


def test_deepest_leaf():
    tree = {"name": "A", "children": [{"name": "B", "children": [{"name": "C", "children": [{"name": "D"}]}]}]}
    assert category_path(tree, "D") == ["A", "B", "C", "D"]


def test_not_found():
    assert category_path(CATALOG, "Phones") is None


def test_leaf_without_children_key():
    """Листи можуть не мати ключа children: node.get(\"children\", [])."""
    assert category_path({"name": "Solo"}, "Other") is None
