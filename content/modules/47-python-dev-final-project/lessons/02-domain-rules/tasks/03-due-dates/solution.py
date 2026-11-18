from datetime import timedelta

from status import Status

SLA_DAYS = {"urgent": 1, "normal": 3, "low": 5}
SATURDAY = 5
# Поки клієнт вирішує або ремонт уже завершено, годинник SLA не йде.
CLOCK_RUNNING = (Status.RECEIVED, Status.DIAGNOSING, Status.REPAIRING)


def is_working_day(day, holidays=frozenset()):
    return day.weekday() < SATURDAY and day not in holidays


def due_date(received_on, priority, holidays=frozenset()):
    if priority not in SLA_DAYS:
        raise ValueError(f"unknown priority: {priority}")
    day = received_on
    left = SLA_DAYS[priority]
    while left > 0:
        day += timedelta(days=1)
        if is_working_day(day, holidays):
            left -= 1
    return day


def is_overdue(due_on, today, status):
    return Status(status) in CLOCK_RUNNING and today > due_on
