"""Статуси заявки з кроку 1 (лише для читання)."""

from enum import StrEnum


class Status(StrEnum):
    RECEIVED = "received"
    DIAGNOSING = "diagnosing"
    WAITING_APPROVAL = "waiting_approval"
    REPAIRING = "repairing"
    READY = "ready"
    CLOSED = "closed"
    CANCELLED = "cancelled"


