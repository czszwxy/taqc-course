"""Gadgetly Repairs: domain rules (no database, no web framework)."""

import math
from dataclasses import dataclass
from datetime import date, timedelta
from enum import StrEnum


class Status(StrEnum):
    RECEIVED = "received"
    DIAGNOSING = "diagnosing"
    WAITING_APPROVAL = "waiting_approval"
    REPAIRING = "repairing"
    READY = "ready"
    CLOSED = "closed"
    CANCELLED = "cancelled"


CUSTOMER = "customer"
STAFF = "staff"

# (from, to) -> roles that may make this change
TRANSITIONS = {
    (Status.RECEIVED, Status.DIAGNOSING): {STAFF},
    (Status.RECEIVED, Status.CANCELLED): {CUSTOMER, STAFF},
    (Status.DIAGNOSING, Status.WAITING_APPROVAL): {STAFF},
    (Status.DIAGNOSING, Status.CANCELLED): {STAFF},
    (Status.WAITING_APPROVAL, Status.REPAIRING): {CUSTOMER},
    (Status.WAITING_APPROVAL, Status.CANCELLED): {CUSTOMER},
    (Status.REPAIRING, Status.READY): {STAFF},
    (Status.READY, Status.CLOSED): {STAFF},
}


class RepairError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def change_status(current, new, role):
    roles = TRANSITIONS.get((Status(current), Status(new)))
    if roles is None:
        raise RepairError("invalid_transition")
    if role not in roles:
        raise RepairError("forbidden")
    return Status(new)


def next_statuses(current, role):
    current = Status(current)
    return [new for new in Status if role in TRANSITIONS.get((current, new), set())]


SLA_DAYS = {"urgent": 1, "normal": 3, "low": 5}
SATURDAY = 5
# The SLA clock does not run while the customer decides or after the repair is done.
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


@dataclass(frozen=True)
class Part:
    name: str
    price: int
    accidental: bool = False


@dataclass(frozen=True)
class Estimate:
    parts_total: int
    labour_total: int
    total: int


LABOUR_BLOCK_MINUTES = 15
LABOUR_BLOCK_PRICE = 150


def estimate(parts, labour_minutes, under_warranty):
    if labour_minutes < 0:
        raise ValueError("labour_minutes must not be negative")
    parts_total = 0
    for part in parts:
        if part.price < 0:
            raise ValueError(f"negative price: {part.name}")
        if not under_warranty or part.accidental:
            parts_total += part.price
    labour_total = 0
    if not under_warranty:
        labour_total = math.ceil(labour_minutes / LABOUR_BLOCK_MINUTES) * LABOUR_BLOCK_PRICE
    return Estimate(parts_total, labour_total, parts_total + labour_total)
