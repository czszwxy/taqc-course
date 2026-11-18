from datetime import date

import pytest

from solution import due_date, is_overdue, is_working_day

MONDAY = date(2026, 11, 16)
WEDNESDAY = date(2026, 11, 18)
FRIDAY = date(2026, 11, 20)
SATURDAY = date(2026, 11, 21)
SUNDAY = date(2026, 11, 22)


@pytest.mark.parametrize(
    ("day", "expected"),
    [(MONDAY, True), (FRIDAY, True), (SATURDAY, False), (SUNDAY, False)],
)
def test_working_days(day, expected):
    """Робочі дні — з понеділка по п'ятницю: day.weekday() < 5."""
    assert is_working_day(day) is expected


def test_holiday_is_not_a_working_day():
    """День із множини holidays — неробочий, навіть якщо це середа."""
    assert is_working_day(WEDNESDAY, {WEDNESDAY}) is False


@pytest.mark.parametrize(
    ("priority", "expected"),
    [("urgent", date(2026, 11, 17)), ("normal", date(2026, 11, 19)), ("low", date(2026, 11, 23))],
)
def test_due_date_from_monday(priority, expected):
    """День прийому не рахується: понеділок + 3 робочі дні = четвер."""
    assert due_date(MONDAY, priority) == expected


def test_weekend_is_skipped():
    """Середа + 3 робочі дні: чт, пт, (сб, нд пропускаємо), пн."""
    assert due_date(WEDNESDAY, "normal") == date(2026, 11, 23)


def test_friday_urgent_is_monday():
    assert due_date(FRIDAY, "urgent") == date(2026, 11, 23)


def test_received_on_saturday():
    """Прийнято в суботу: перший робочий день після неї — понеділок."""
    assert due_date(SATURDAY, "urgent") == date(2026, 11, 23)
    assert due_date(SATURDAY, "low") == date(2026, 11, 27)


def test_holidays_are_skipped():
    """Свято посеред строку зсуває дедлайн на день: чт і пт — свята → середа + 1 = понеділок."""
    holidays = {date(2026, 11, 19), date(2026, 11, 20)}
    assert due_date(WEDNESDAY, "urgent", holidays) == date(2026, 11, 23)


def test_holiday_on_received_day_changes_nothing():
    """День прийому не рахується взагалі — тож свято саме в цей день нічого не змінює."""
    assert due_date(MONDAY, "normal", {MONDAY}) == date(2026, 11, 19)


def test_due_date_across_months():
    assert due_date(date(2026, 12, 30), "normal") == date(2027, 1, 4)


def test_unknown_priority():
    """Невідомий пріоритет — ValueError з назвою пріоритету в повідомленні."""
    with pytest.raises(ValueError, match="asap"):
        due_date(MONDAY, "asap")


def test_overdue_after_the_due_day():
    """Прострочено, лише коли today > due_on: у сам день дедлайну ще вчасно."""
    assert is_overdue(WEDNESDAY, date(2026, 11, 19), "diagnosing") is True
    assert is_overdue(WEDNESDAY, WEDNESDAY, "diagnosing") is False
    assert is_overdue(WEDNESDAY, MONDAY, "diagnosing") is False


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        ("received", True),
        ("diagnosing", True),
        ("repairing", True),
        ("waiting_approval", False),
        ("ready", False),
        ("closed", False),
        ("cancelled", False),
    ],
)
def test_overdue_only_while_the_clock_runs(status, expected):
    """Годинник SLA йде лише в received, diagnosing і repairing: поки клієнт вирішує або ремонт завершено — не прострочено."""
    assert is_overdue(MONDAY, FRIDAY, status) is expected
