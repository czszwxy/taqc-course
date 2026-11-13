from solution import Order, OrderItem


def test_item_default_qty():
    assert OrderItem(1, 450).qty == 1


def test_total():
    order = Order(2001)
    order.add(OrderItem(1, 450, 2))
    order.add(OrderItem(3, 150))
    assert order.total() == 1050


def test_discount_floor():
    """Сума мінус знижка, але не менше 0."""
    assert Order(2002, discount=100).total() == 0
    order = Order(2003, [OrderItem(1, 450)], discount=50)
    assert order.total() == 400


def test_orders_do_not_share_items():
    """Кожне замовлення — свій список: field(default_factory=list)."""
    first = Order(1)
    first.add(OrderItem(1, 450))
    assert Order(2).items == []


def test_equality():
    assert Order(1, [OrderItem(1, 450)]) == Order(1, [OrderItem(1, 450, 1)], 0)
