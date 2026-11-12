from solution import report_line


def test_passed():
    """Формат: "Test " + name + ": " + status — з пробілами й двокрапкою."""
    assert report_line("login", "passed") == "Test login: passed"


def test_failed():
    assert report_line("checkout", "failed") == "Test checkout: failed"


def test_returns_value():
    """Функція має повертати рядок через return, а не друкувати його."""
    assert report_line("search", "skipped") is not None
