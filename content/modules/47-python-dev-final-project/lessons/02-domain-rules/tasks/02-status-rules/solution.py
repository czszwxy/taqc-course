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
