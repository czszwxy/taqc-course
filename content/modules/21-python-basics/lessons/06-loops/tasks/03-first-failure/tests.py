from solution import first_failed_index


def test_first_of_many():
    """Потрібен ПЕРШИЙ — повертай одразу, коли знайшов."""
    assert first_failed_index(["passed", "failed", "failed"]) == 1


def test_at_start():
    assert first_failed_index(["failed", "passed"]) == 0


def test_none_failed():
    """Немає провалених — -1 (return після циклу)."""
    assert first_failed_index(["passed", "passed"]) == -1


def test_empty():
    assert first_failed_index([]) == -1
