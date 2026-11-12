import sys


def run_program(capsys):
    sys.modules.pop("solution", None)
    import solution  # noqa: F401 — importing runs the program
    return capsys.readouterr().out


def test_prints_three_lines(capsys):
    """Потрібно рівно три рядки — три виклики print()."""
    lines = run_program(capsys).splitlines()
    assert len(lines) == 3


def test_first_line(capsys):
    """Перший рядок: Test run: login page"""
    assert run_program(capsys).splitlines()[0] == "Test run: login page"


def test_counts(capsys):
    """Другий і третій рядки: Passed: 12 і Failed: 1 — з пробілом після двокрапки."""
    assert run_program(capsys).splitlines()[1:] == ["Passed: 12", "Failed: 1"]
