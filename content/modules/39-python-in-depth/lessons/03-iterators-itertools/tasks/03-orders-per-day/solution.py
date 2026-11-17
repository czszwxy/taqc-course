from itertools import groupby


def day_of(order):
    return order["created_at"][:10]


def orders_per_day(orders):
    result = []
    for day, group in groupby(sorted(orders, key=day_of), key=day_of):
        day_orders = list(group)
        result.append((day, len(day_orders), sum(order["total"] for order in day_orders)))
    return result
