from solution import make_id_sequence


def test_starts_at_start():
    """Перший виклик повертає саме start."""
    assert make_id_sequence(2001)() == 2001


def test_sequence():
    next_id = make_id_sequence(2001)
    assert [next_id(), next_id(), next_id()] == [2001, 2002, 2003]


def test_independent():
    a = make_id_sequence(1)
    b = make_id_sequence(100)
    a()
    assert b() == 100
    assert a() == 2
