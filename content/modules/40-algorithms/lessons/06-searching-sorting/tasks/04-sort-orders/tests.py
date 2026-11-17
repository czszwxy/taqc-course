from solution import sort_orders


def order(order_id, status, created_at):
    return {"id": order_id, "status": status, "created_at": created_at}


def ids(orders):
    return [o["id"] for o in orders]


def test_example():
    orders = [
        order(7, "new", "2026-03-20T10:00"),
        order(3, "paid", "2026-03-19T09:00"),
        order(5, "paid", "2026-03-20T08:00"),
        order(9, "urgent", "2026-03-18T12:00"),
    ]
    assert ids(sort_orders(orders)) == [9, 5, 3, 7]


def test_unknown_status_goes_last():
    orders = [order(1, "refunded", "2026-03-21T00:00"), order(2, "new", "2026-03-01T00:00")]
    assert ids(sort_orders(orders)) == [2, 1]


def test_same_time_sorted_by_id():
    """Однаковий статус і час — за id за зростанням (перший прохід)."""
    orders = [order(30, "paid", "2026-03-20T10:00"), order(10, "paid", "2026-03-20T10:00"), order(20, "paid", "2026-03-20T10:00")]
    assert ids(sort_orders(orders)) == [10, 20, 30]


def test_newest_first_within_a_status():
    orders = [order(1, "new", "2026-03-01T09:00"), order(2, "new", "2026-03-02T09:00"), order(3, "new", "2026-03-01T10:00")]
    assert ids(sort_orders(orders)) == [2, 3, 1]


def test_all_rules_together():
    orders = [
        order(4, "new", "2026-03-20T10:00"),
        order(2, "urgent", "2026-03-20T10:00"),
        order(8, "urgent", "2026-03-21T10:00"),
        order(1, "urgent", "2026-03-20T10:00"),
        order(6, "paid", "2026-03-19T10:00"),
    ]
    assert ids(sort_orders(orders)) == [8, 1, 2, 6, 4]


def test_input_is_not_changed():
    orders = [order(2, "new", "2026-03-01T00:00"), order(1, "urgent", "2026-03-01T00:00")]
    sort_orders(orders)
    assert ids(orders) == [2, 1]
