from solution import top_slowest


def test_top_two():
    """За спаданням: reverse=True, потім зріз [:n]."""
    assert top_slowest([120, 85, 340, 95], 2) == [340, 120]


def test_n_bigger_than_list():
    assert top_slowest([120, 85], 5) == [120, 85]


def test_zero():
    assert top_slowest([120, 85], 0) == []


def test_input_unchanged():
    """Не змінюй вхідний список: sorted(), а не .sort()."""
    times = [85, 340]
    top_slowest(times, 1)
    assert times == [85, 340]
