from solution import orders_per_day


def order(order_id, created_at, total):
    return {"id": order_id, "created_at": created_at, "total": total}


def test_unsorted_orders_are_grouped_by_day():
    """Спершу відсортуй за днем — groupby групує лише сусідні елементи."""
    orders = [
        order(1, "2026-03-02T09:00:00", 500),
        order(2, "2026-03-01T18:30:00", 1200),
        order(3, "2026-03-02T21:15:00", 300),
    ]
    assert orders_per_day(orders) == [("2026-03-01", 1, 1200), ("2026-03-02", 2, 800)]


def test_same_day_is_not_split():
    """Якщо дні чергуються, без сортування той самий день з'явиться двічі."""
    orders = [
        order(1, "2026-03-01T10:00:00", 100),
        order(2, "2026-03-03T10:00:00", 200),
        order(3, "2026-03-01T23:59:59", 300),
    ]
    assert orders_per_day(orders) == [("2026-03-01", 2, 400), ("2026-03-03", 1, 200)]


def test_count_and_total_from_the_same_group():
    """Група — одноразовий ітератор: збережи list(group) і рахуй з нього і кількість, і суму."""
    orders = [order(n, "2026-03-05T12:00:00", 10) for n in range(4)]
    assert orders_per_day(orders) == [("2026-03-05", 4, 40)]


def test_no_orders():
    assert orders_per_day([]) == []
