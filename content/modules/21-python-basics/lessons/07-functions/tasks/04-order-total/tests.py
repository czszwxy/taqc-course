from solution import line_total, order_total


def test_line_total():
    assert line_total(450, 2) == 900


def test_order_total():
    """Сума всіх рядків: line_total для кожної пари prices[i], quantities[i]."""
    assert order_total([450, 150], [2, 1]) == 1050


def test_default_discount():
    """discount=0 за замовчуванням — його можна не передавати."""
    assert order_total([100], [3]) == 300


def test_with_discount():
    assert order_total([450, 150], [2, 1], discount=100) == 950


def test_not_below_zero():
    """Знижка більша за суму — результат 0."""
    assert order_total([100], [1], discount=500) == 0


def test_empty_order():
    assert order_total([], []) == 0
