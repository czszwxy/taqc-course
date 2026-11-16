from solution import passed_on_rerun


def attempt(test, number, outcome):
    return {"test": test, "attempt": number, "outcome": outcome}


def test_example():
    attempts = [
        attempt("test_cart", 2, "passed"),
        attempt("test_cart", 1, "failed"),
        attempt("test_login", 1, "passed"),
    ]
    assert passed_on_rerun(attempts) == ["test_cart"]


def test_failed_every_attempt_is_not_included():
    """Упав в усіх спробах — він і так червоний у звіті."""
    attempts = [attempt("test_search", 1, "failed"), attempt("test_search", 2, "failed"), attempt("test_search", 3, "failed")]
    assert passed_on_rerun(attempts) == []


def test_passed_on_third_attempt():
    attempts = [attempt("test_order", 3, "passed"), attempt("test_order", 1, "failed"), attempt("test_order", 2, "failed")]
    assert passed_on_rerun(attempts) == ["test_order"]


def test_order_of_attempts_does_not_matter():
    """Спроби приходять у довільному порядку — визнач першу за номером attempt, а не за позицією в списку."""
    attempts = [attempt("test_api", 2, "failed"), attempt("test_api", 1, "passed")]
    assert passed_on_rerun(attempts) == []


def test_sorted_names():
    attempts = [
        attempt("test_z", 1, "failed"),
        attempt("test_z", 2, "passed"),
        attempt("test_a", 1, "failed"),
        attempt("test_a", 2, "passed"),
    ]
    assert passed_on_rerun(attempts) == ["test_a", "test_z"]


def test_empty():
    assert passed_on_rerun([]) == []
