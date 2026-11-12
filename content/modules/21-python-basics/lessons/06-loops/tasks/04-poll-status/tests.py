from solution import polls_until_paid


def test_paid_on_third_poll():
    """Номер перевірки рахується з 1: третя перевірка — 3."""
    assert polls_until_paid(["pending", "pending", "paid"], 5) == 3


def test_limit_reached():
    """Ліміт 2 перевірки — до третьої відповіді не доходимо: -1."""
    assert polls_until_paid(["pending", "pending", "paid"], 2) == -1


def test_paid_immediately():
    assert polls_until_paid(["paid"], 5) == 1


def test_never_paid():
    """Список закінчився без paid — -1 (і без IndexError)."""
    assert polls_until_paid(["pending", "failed"], 5) == -1


def test_empty():
    assert polls_until_paid([], 5) == -1
