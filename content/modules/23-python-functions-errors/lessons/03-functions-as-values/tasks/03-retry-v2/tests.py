from solution import poll


def test_status_reached():
    statuses = iter(["created", "paid", "shipped"])
    assert poll(lambda: next(statuses), "paid", 5) == 2


def test_one_call_per_attempt():
    """Виклич get_status() один раз на спробу — інакше пропустиш статуси."""
    statuses = iter(["created", "created", "paid", "shipped"])
    assert poll(lambda: next(statuses), "paid", 5) == 3


def test_never_reached():
    calls = []

    def get_status():
        calls.append(1)
        return "created"

    assert poll(get_status, "paid", 3) is None
    assert len(calls) == 3
