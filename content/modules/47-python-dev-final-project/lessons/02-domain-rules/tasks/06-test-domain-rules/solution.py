from datetime import date

import pytest

from subject import Estimate, Part, due_date, estimate, is_overdue

MONDAY = date(2026, 11, 16)
WEDNESDAY = date(2026, 11, 18)
THURSDAY = date(2026, 11, 19)
NEXT_MONDAY = date(2026, 11, 23)


def test_normal_priority_from_monday():
    assert due_date(MONDAY, "normal") == date(2026, 11, 19)


def test_weekend_is_skipped():
    assert due_date(WEDNESDAY, "normal") == NEXT_MONDAY


def test_holiday_moves_the_deadline():
    assert due_date(WEDNESDAY, "urgent", {THURSDAY}) == date(2026, 11, 20)


def test_overdue_starts_the_day_after_the_deadline():
    assert is_overdue(WEDNESDAY, WEDNESDAY, "repairing") is False
    assert is_overdue(WEDNESDAY, THURSDAY, "repairing") is True


def test_waiting_for_the_customer_is_never_overdue():
    assert is_overdue(MONDAY, NEXT_MONDAY, "waiting_approval") is False


@pytest.mark.parametrize(("minutes", "labour"), [(15, 150), (16, 300)])
def test_labour_per_started_block(minutes, labour):
    assert estimate([], minutes, False).labour_total == labour


def test_warranty_still_charges_accidental_damage():
    parts = [Part("screen", 2400), Part("back glass", 300, accidental=True)]
    assert estimate(parts, 45, True) == Estimate(300, 0, 300)
