from solution import first_slow_index


def test_first_of_several():
    """Повертай перший збіг, а не останній."""
    assert first_slow_index([120, 850, 300, 1200], 500) == 1


def test_first_element():
    assert first_slow_index([900, 100], 500) == 0


def test_not_found():
    """Нічого не знайшли — -1 (return після циклу)."""
    assert first_slow_index([100, 200], 500) == -1


def test_checks_all_elements():
    """return -1 має стояти після циклу, а не всередині нього."""
    assert first_slow_index([100, 200, 300, 900], 500) == 3
