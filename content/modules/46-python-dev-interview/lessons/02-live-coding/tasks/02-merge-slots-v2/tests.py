import pytest

from solution import free_slots


def test_example():
    """Перекриття (600–660 і 630–720) зливаються; вільні — дірки між ними й краї дня."""
    assert free_slots([(600, 660), (630, 720), (840, 900)], 540, 1080) == [(540, 600), (720, 840), (900, 1080)]


def test_unsorted_input():
    assert free_slots([(840, 900), (600, 660)], 540, 1080) == [(540, 600), (660, 840), (900, 1080)]


def test_no_bookings():
    """Без бронювань — увесь день."""
    assert free_slots([], 540, 1080) == [(540, 1080)]


def test_whole_day_busy():
    """Бронювання довше за день — вільного часу немає."""
    assert free_slots([(500, 1100)], 540, 1080) == []


def test_bookings_outside_the_day_ignored():
    """Проміжки повністю до або після робочого дня нічого не займають."""
    assert free_slots([(300, 400), (1100, 1200)], 540, 1080) == [(540, 1080)]


def test_booking_crossing_day_edges():
    """Обрізай бронювання межами дня."""
    assert free_slots([(480, 600), (1000, 1200)], 540, 1080) == [(600, 1000)]


def test_touching_bookings_leave_no_gap():
    """Дотичні бронювання не лишають «вікна» нульової довжини."""
    assert free_slots([(600, 660), (660, 720)], 540, 1080) == [(540, 600), (720, 1080)]


def test_nested_booking():
    """Вкладене бронювання не «звільняє» хвіст зовнішнього: cursor = max(cursor, end)."""
    assert free_slots([(600, 900), (650, 700)], 540, 1080) == [(540, 600), (900, 1080)]


def test_bad_day():
    with pytest.raises(ValueError):
        free_slots([], 1080, 540)
