from solution import group_queries


def test_example():
    queries = ["Wireless Headphones", "usb hub", "headphones wireless", "mouse", "Hub USB", "  "]
    assert group_queries(queries) == [
        ["Wireless Headphones", "headphones wireless"],
        ["usb hub", "Hub USB"],
        ["mouse"],
    ]


def test_extra_spaces_do_not_matter():
    """split() без аргументів ігнорує зайві пробіли."""
    assert group_queries(["usb  hub", " hub usb "]) == [["usb  hub", " hub usb "]]


def test_different_word_counts_are_different_groups():
    """\"usb usb hub\" і \"usb hub\" — різні підписи (кортеж зберігає повтори слів)."""
    assert group_queries(["usb hub", "usb usb hub"]) == [["usb hub"], ["usb usb hub"]]


def test_empty_queries_are_skipped():
    assert group_queries(["", "   "]) == []
    assert group_queries([]) == []
