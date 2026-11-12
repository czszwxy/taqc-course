from solution import boxes_needed


def test_partial_box():
    """Неповна коробка теж рахується: 25 по 10 — це 3."""
    assert boxes_needed(25, 10) == 3


def test_exact():
    """Рівно кратна кількість — без зайвої коробки."""
    assert boxes_needed(20, 10) == 2


def test_one_item():
    assert boxes_needed(1, 10) == 1


def test_zero():
    assert boxes_needed(0, 10) == 0
