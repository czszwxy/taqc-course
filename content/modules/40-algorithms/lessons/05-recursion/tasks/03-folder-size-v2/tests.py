from solution import count_files

PROJECT = {"main.py": 3400, "README.md": 1200, "src": {"Utils.PY": 800, "tests": {"test_main.py": 500}}}


def test_example():
    assert count_files(PROJECT, ".py") == 3


def test_case_insensitive_both_ways():
    assert count_files(PROJECT, ".PY") == 3


def test_folders_are_not_counted():
    """Папка з іменем на .py — не файл: спершу перевір, чи значення — словник."""
    assert count_files({"backup.py": {"old.txt": 10}}, ".py") == 0


def test_other_extension():
    assert count_files(PROJECT, ".md") == 1


def test_empty_folder():
    assert count_files({}, ".py") == 0
