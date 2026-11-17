from solution import folder_size

PROJECT = {
    "README.md": 1200,
    "src": {"main.py": 3400, "utils": {"money.py": 800}},
    "assets": {},
}


def test_example():
    assert folder_size(PROJECT) == 5400


def test_empty_folder():
    assert folder_size({}) == 0


def test_only_files():
    assert folder_size({"a.txt": 1, "b.txt": 2}) == 3


def test_deeply_nested_file():
    """Рекурсивний виклик для кожної підпапки — на будь-якій глибині."""
    folder = {"a": {"b": {"c": {"d": {"backup.zip": 7000}}}}}
    assert folder_size(folder) == 7000


def test_input_is_not_changed():
    folder = {"src": {"main.py": 10}}
    folder_size(folder)
    assert folder == {"src": {"main.py": 10}}
