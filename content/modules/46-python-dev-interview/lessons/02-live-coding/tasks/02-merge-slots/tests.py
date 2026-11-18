import pytest

from solution import merge_slots


def test_overlapping_unsorted():
    """Вхід не відсортований: спершу sorted, потім один прохід."""
    assert merge_slots([(780, 840), (600, 720), (690, 750)]) == [(600, 750), (780, 840)]


def test_touching_windows_merge():
    """(600, 720) і (720, 780) торкаються — це одне вікно: порівнюй start <= last_end."""
    assert merge_slots([(600, 720), (720, 780)]) == [(600, 780)]


def test_window_inside_another():
    """Вкладене вікно не обрізає зовнішнє: кінець — max(last_end, end)."""
    assert merge_slots([(600, 900), (650, 700)]) == [(600, 900)]


def test_separate_windows_stay():
    assert merge_slots([(900, 960), (600, 660)]) == [(600, 660), (900, 960)]


def test_chain_of_overlaps():
    """Ланцюжок перекриттів зливається в одне вікно."""
    assert merge_slots([(600, 660), (650, 700), (690, 800), (790, 900)]) == [(600, 900)]


def test_empty():
    assert merge_slots([]) == []


def test_single():
    assert merge_slots([(0, 1440)]) == [(0, 1440)]


def test_input_not_changed():
    """Вхідний список не змінюється: sorted(...) замість .sort()."""
    slots = [(780, 840), (600, 720)]
    merge_slots(slots)
    assert slots == [(780, 840), (600, 720)]


@pytest.mark.parametrize("slot", [(720, 600), (600, 600), (-10, 60), (1400, 1441)])
def test_bad_slot(slot):
    """start >= end, від'ємний початок або кінець після 1440 — ValueError."""
    with pytest.raises(ValueError):
        merge_slots([(0, 60), slot])
