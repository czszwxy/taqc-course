from solution import find_flaky


def run(test, commit, outcome):
    return {"test": test, "commit": commit, "outcome": outcome}


def test_example():
    runs = [
        run("test_cart", "a1", "passed"),
        run("test_cart", "a1", "failed"),
        run("test_login", "a1", "passed"),
        run("test_login", "b2", "failed"),
    ]
    assert find_flaky(runs) == ["test_cart"]


def test_always_failing_is_not_flaky():
    """Завжди червоний на коміті — зламаний тест або баг, не flaky."""
    runs = [run("test_search", "a1", "failed"), run("test_search", "a1", "failed")]
    assert find_flaky(runs) == []


def test_different_commits_are_not_flaky():
    """Пройшов на a1, упав на b2 — змінився код. Групуй за (test, commit)."""
    runs = [run("test_order", "a1", "passed"), run("test_order", "b2", "failed")]
    assert find_flaky(runs) == []


def test_skipped_is_ignored():
    """skipped — не прохід і не падіння."""
    runs = [
        run("test_promo", "a1", "skipped"),
        run("test_promo", "a1", "failed"),
        run("test_api", "a1", "skipped"),
        run("test_api", "a1", "passed"),
    ]
    assert find_flaky(runs) == []


def test_unique_and_sorted():
    """Тест flaky на двох комітах — у списку один раз; список відсортований."""
    runs = [
        run("test_z", "a1", "failed"),
        run("test_z", "a1", "passed"),
        run("test_a", "b2", "passed"),
        run("test_a", "b2", "failed"),
        run("test_z", "b2", "passed"),
        run("test_z", "b2", "failed"),
    ]
    assert find_flaky(runs) == ["test_a", "test_z"]


def test_empty_history():
    assert find_flaky([]) == []
