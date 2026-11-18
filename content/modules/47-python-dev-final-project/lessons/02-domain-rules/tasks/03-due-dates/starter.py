from datetime import timedelta

from status import Status

SLA_DAYS = {"urgent": 1, "normal": 3, "low": 5}


def is_working_day(day, holidays=frozenset()):
    # твій код тут
    pass


def due_date(received_on, priority, holidays=frozenset()):
    # твій код тут
    pass


def is_overdue(due_on, today, status):
    # твій код тут
    pass
