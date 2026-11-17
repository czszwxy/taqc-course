from solution import longest_run


def test_longest_run_in_the_middle():
    values = ["up", "down", "down", "up", "down", "down", "down", "up"]
    assert longest_run(values) == ("down", 3)


def test_runs_are_not_merged():
    """Рахуй серії поспіль, а не загальну кількість: 'a' зустрічається 3 рази, але найдовша серія — 'b' × 2."""
    assert longest_run(["a", "b", "b", "a", "c", "a"]) == ("b", 2)


def test_first_run_wins_a_tie():
    """При рівній довжині лишається перша серія: оновлюй лише при довжині > поточної."""
    assert longest_run(["up", "up", "down", "down"]) == ("up", 2)


def test_single_value():
    assert longest_run(["degraded"]) == ("degraded", 1)


def test_empty_input():
    """Немає даних — None."""
    assert longest_run([]) is None


def test_works_with_a_generator():
    statuses = (status for status in ["down", "up", "up", "up"])
    assert longest_run(statuses) == ("up", 3)
