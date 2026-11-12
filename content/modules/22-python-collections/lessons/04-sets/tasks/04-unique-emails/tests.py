from solution import count_unique_emails


def test_case_and_spaces():
    """Нормалізуй перед додаванням у множину: strip().lower()."""
    assert count_unique_emails(["qa@example.test", " QA@Example.test", "dev@example.test"]) == 2


def test_all_different():
    assert count_unique_emails(["a@x.test", "b@x.test"]) == 2


def test_all_same():
    assert count_unique_emails(["a@x.test", "A@X.TEST", " a@x.test "]) == 1


def test_empty():
    assert count_unique_emails([]) == 0
