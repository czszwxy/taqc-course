from solution import retry


def make_action(succeed_on):
    """Фейкова дія: повертає True на виклику номер succeed_on (0 — ніколи) і рахує виклики."""
    calls = []

    def action():
        calls.append(1)
        return len(calls) == succeed_on

    return action, calls


def test_success_on_third():
    """Поверни номер спроби (з 1), на якій action() повернула True."""
    action, calls = make_action(3)
    assert retry(action, 5) == 3


def test_stops_after_success():
    """Після успіху — одразу return, без зайвих викликів."""
    action, calls = make_action(2)
    retry(action, 5)
    assert len(calls) == 2


def test_never_succeeds():
    """Не вийшло — None, і action викликана рівно attempts разів."""
    action, calls = make_action(0)
    assert retry(action, 3) is None
    assert len(calls) == 3


def test_first_try():
    action, calls = make_action(1)
    assert retry(action, 3) == 1
