from solution import summary


def test_mixed_results():
    """Числа перед конкатенацією з рядком — через str() або f-string."""
    assert summary(["passed", "failed", "passed", "skipped"]) == "2 passed, 1 failed, 1 skipped"


def test_counts_several_failures():
    """failed =+ 1 присвоює +1 замість додавання. Потрібно +=."""
    assert summary(["failed", "failed", "failed"]) == "0 passed, 3 failed, 0 skipped"


def test_counts_skipped():
    """Перевір написання статусу \"skipped\" у коді."""
    assert summary(["skipped", "skipped"]) == "0 passed, 0 failed, 2 skipped"


def test_empty():
    assert summary([]) == "0 passed, 0 failed, 0 skipped"
