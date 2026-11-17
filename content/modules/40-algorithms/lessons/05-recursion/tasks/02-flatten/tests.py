from solution import flatten


def test_nested_lists():
    items = ["KB-01", ["MS-02", ["HD-07", []], "PAD"], [[["USB"]]]]
    assert flatten(items) == ["KB-01", "MS-02", "HD-07", "PAD", "USB"]


def test_strings_and_tuples_are_values():
    """Заходь лише в списки: isinstance(item, list). Рядок і кортеж — значення."""
    assert flatten([("bundle", 2), "gift"]) == [("bundle", 2), "gift"]


def test_empty_lists():
    assert flatten([]) == []
    assert flatten([[], [[]]]) == []


def test_already_flat():
    assert flatten([1, 2, 3]) == [1, 2, 3]


def test_input_is_not_changed():
    items = [1, [2, [3]]]
    flatten(items)
    assert items == [1, [2, [3]]]


def test_deep_nesting():
    deep = "core"
    for _ in range(50):
        deep = [deep]
    assert flatten([deep, "end"]) == ["core", "end"]
