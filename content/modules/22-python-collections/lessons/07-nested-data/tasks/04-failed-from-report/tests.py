import json

from solution import failed_tests


def make_report(suites):
    return json.dumps({"suites": suites})


LOGIN = {
    "name": "Login",
    "tests": [
        {"title": "valid login", "status": "passed"},
        {"title": "locked user", "status": "failed"},
    ],
}
CART = {"name": "Cart", "tests": [{"title": "add item", "status": "failed"}]}


def test_failed_from_all_suites():
    """Пройди всі набори і всі тести в кожному — два вкладені цикли."""
    assert failed_tests(make_report([LOGIN, CART])) == ["Login > locked user", "Cart > add item"]


def test_format():
    """Формат: "<suite> > <test>" — назва набору, пробіл, >, пробіл, назва тесту."""
    assert failed_tests(make_report([CART])) == ["Cart > add item"]


def test_skipped_is_not_failed():
    suite = {"name": "Search", "tests": [{"title": "filters", "status": "skipped"}]}
    assert failed_tests(make_report([suite])) == []


def test_empty_suite():
    """Набір без тестів — не падай."""
    assert failed_tests(make_report([{"name": "Empty", "tests": []}, CART])) == ["Cart > add item"]


def test_no_suites():
    assert failed_tests(make_report([])) == []
