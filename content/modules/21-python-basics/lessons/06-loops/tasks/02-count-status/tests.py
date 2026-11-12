from solution import count_status

RESULTS = ["passed", "failed", "passed", "skipped"]


def test_counts_matches():
    """Збільшуй лічильник, коли result == status."""
    assert count_status(RESULTS, "passed") == 2
    assert count_status(RESULTS, "failed") == 1


def test_no_matches():
    assert count_status(RESULTS, "broken") == 0


def test_empty_list():
    """Для порожнього списку — 0 (лічильник оголошено до циклу)."""
    assert count_status([], "passed") == 0


def test_counts_whole_list():
    """return після циклу, а не всередині — інакше порахуєш лише перший елемент."""
    assert count_status(["failed", "passed", "passed", "passed"], "passed") == 3
