from solution import pass_rate


def test_mixed():
    """Ділимо на кількість усіх результатів: len(results)."""
    assert pass_rate(["passed", "failed", "passed", "passed"]) == 75.0


def test_all_passed():
    """passed =+ 1 присвоює 1 замість додавання — потрібно +=."""
    assert pass_rate(["passed", "passed", "passed"]) == 100.0


def test_lowercase_status():
    """Статуси приходять малими літерами: "passed", не "Passed"."""
    assert pass_rate(["passed", "failed"]) == 50.0


def test_none_passed():
    assert pass_rate(["failed", "failed"]) == 0.0


def test_empty():
    """Порожній список — 0.0, без ділення на нуль."""
    assert pass_rate([]) == 0.0
