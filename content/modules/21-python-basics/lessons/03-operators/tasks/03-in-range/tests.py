from solution import in_range


def test_inside():
    assert in_range(50, 18, 99) is True


def test_boundaries_are_included():
    """Межі включні: використай <=, а не <."""
    assert in_range(18, 18, 99) is True
    assert in_range(99, 18, 99) is True


def test_outside():
    """Значення поруч із межею ззовні — False."""
    assert in_range(17, 18, 99) is False
    assert in_range(100, 18, 99) is False


def test_floats():
    assert in_range(9999.99, 0, 10000) is True
    assert in_range(10000.01, 0, 10000) is False
