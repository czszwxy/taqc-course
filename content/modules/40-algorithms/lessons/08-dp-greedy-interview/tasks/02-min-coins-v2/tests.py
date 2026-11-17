from solution import count_ways


def test_example():
    assert count_ways(5, [1, 2, 5]) == 4


def test_order_does_not_matter():
    """1 + 2 і 2 + 1 — один набір: зовнішній цикл по монетах."""
    assert count_ways(3, [1, 2]) == 2


def test_impossible():
    assert count_ways(3, [2]) == 0


def test_zero_amount():
    assert count_ways(0, [1, 2]) == 1


def test_classic_two_hundred():
    assert count_ways(200, [1, 2, 5, 10, 20, 50, 100, 200]) == 73682


def test_coin_order_does_not_matter():
    assert count_ways(10, [5, 2, 1]) == count_ways(10, [1, 2, 5]) == 10
