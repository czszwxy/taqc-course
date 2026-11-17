from solution import min_coins


def test_greedy_trap():
    """Жадібно 4 + 1 + 1 = 3 монети, а оптимально 3 + 3 = 2."""
    assert min_coins(6, [1, 3, 4]) == 2


def test_impossible():
    assert min_coins(7, [2, 4]) == -1


def test_zero_amount():
    assert min_coins(0, [1, 5]) == 0


def test_unsorted_coins():
    assert min_coins(11, [5, 1, 2]) == 3


def test_single_coin():
    assert min_coins(9, [3]) == 3
    assert min_coins(10, [3]) == -1


def test_large_amount_is_fast():
    """Таблиця знизу вгору: 10 000 × 4 кроки. Рекурсія без кешу тут не встигне."""
    assert min_coins(10_000, [1, 7, 10, 25]) == 400


def test_amount_smaller_than_all_coins():
    assert min_coins(3, [5, 10]) == -1
