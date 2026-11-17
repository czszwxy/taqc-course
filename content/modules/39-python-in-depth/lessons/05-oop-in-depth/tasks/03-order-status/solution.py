from enum import StrEnum


class OrderStatus(StrEnum):
    NEW = "new"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


ALLOWED = {
    OrderStatus.NEW: {OrderStatus.PAID, OrderStatus.CANCELLED},
    OrderStatus.PAID: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
}


def change_status(current, target):
    current = OrderStatus(current)
    target = OrderStatus(target)
    if target not in ALLOWED.get(current, set()):
        raise ValueError(f"cannot change status from {current} to {target}")
    return target
