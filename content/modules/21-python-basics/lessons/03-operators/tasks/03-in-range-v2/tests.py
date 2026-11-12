from solution import is_valid_age


def test_lower_boundary():
    """18 — допустимий, 17 — ні."""
    assert is_valid_age(18) is True
    assert is_valid_age(17) is False


def test_upper_boundary():
    """120 — допустимий, 121 — ні: межа включно."""
    assert is_valid_age(120) is True
    assert is_valid_age(121) is False


def test_inside():
    assert is_valid_age(35) is True
