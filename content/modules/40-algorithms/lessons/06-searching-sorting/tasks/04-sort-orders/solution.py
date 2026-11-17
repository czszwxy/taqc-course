PRIORITY = {"urgent": 0, "paid": 1, "new": 2}


def status_rank(order):
    return PRIORITY.get(order["status"], len(PRIORITY))


def sort_orders(orders):
    result = sorted(orders, key=lambda order: order["id"])
    result.sort(key=lambda order: order["created_at"], reverse=True)
    result.sort(key=status_rank)
    return result
