from subject import pages_needed


def test_partial_last_page_counts():
    assert pages_needed(25, 10) == 2


def test_single_item_needs_one_page():
    assert pages_needed(1, 10) == 1


# твій код тут
