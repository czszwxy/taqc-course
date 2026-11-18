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

# (звідки, куди) -> множина ролей, яким можна зробити цей перехід
TRANSITIONS = {
    (Status.RECEIVED, Status.DIAGNOSING): {STAFF},
    # твій код тут
}


class RepairError(Exception):
    # твій код тут
    pass


def change_status(current, new, role):
    # твій код тут
    pass


def next_statuses(current, role):
    # твій код тут
    pass
