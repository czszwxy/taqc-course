import pytest

from solution import round_robin


def test_example():
    assert round_robin([("A", 5), ("B", 2), ("C", 4)], 2) == ["B", "C", "A"]


def test_zero_work_finishes_on_its_turn():
    assert round_robin([("A", 3), ("B", 0)], 1) == ["B", "A"]


def test_large_quantum_keeps_the_order():
    """Квант більший за будь-яку задачу — усі завершуються з першого підходу, по черзі."""
    assert round_robin([("A", 5), ("B", 9), ("C", 1)], 10) == ["A", "B", "C"]


def test_unfinished_job_goes_to_the_back():
    """Незавершена задача — у КІНЕЦЬ черги (append), а не на початок."""
    assert round_robin([("long", 3), ("x", 1), ("y", 1)], 1) == ["x", "y", "long"]


def test_no_jobs():
    assert round_robin([], 3) == []


def test_input_list_is_not_changed():
    jobs = [("A", 2), ("B", 1)]
    round_robin(jobs, 1)
    assert jobs == [("A", 2), ("B", 1)]


def test_quantum_must_be_positive():
    with pytest.raises(ValueError, match="quantum must be at least 1"):
        round_robin([("A", 1)], 0)
