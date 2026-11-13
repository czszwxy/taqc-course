from subject import pages_needed


def test_partial_last_page_counts():
    assert pages_needed(25, 10) == 3


def test_single_item_needs_one_page():
    assert pages_needed(1, 10) == 1


def test_exact_multiple_has_no_extra_page():
    assert pages_needed(20, 10) == 2


def test_no_items_no_pages():
    assert pages_needed(0, 10) == 0
