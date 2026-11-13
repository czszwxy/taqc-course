from subject import in_range


def test_value_inside_range():
    assert in_range(5, 1, 10) is True


def test_low_boundary_is_included():
    assert in_range(1, 1, 10) is True


def test_high_boundary_is_included():
    assert in_range(10, 1, 10) is True


def test_below_low_is_outside():
    assert in_range(0, 1, 10) is False


def test_above_high_is_outside():
    assert in_range(11, 1, 10) is False
