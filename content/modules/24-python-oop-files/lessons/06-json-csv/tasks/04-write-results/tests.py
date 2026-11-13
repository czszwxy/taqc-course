import csv

from solution import write_results

RESULTS = [
    {"duration": 1.25, "name": "test_login", "status": "passed"},
    {"name": "test_cart, guest", "status": "failed", "duration": 3.4},
]


def read_back(path):
    with open(path, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_header(tmp_path):
    """Перший рядок — заголовок name,status,duration: writeheader()."""
    path = tmp_path / "results.csv"
    write_results(path, RESULTS)
    assert path.read_text(encoding="utf-8").splitlines()[0] == "name,status,duration"


def test_rows_round_trip(tmp_path):
    """Порядок стовпців — за fieldnames, а не за ключами словника."""
    path = tmp_path / "results.csv"
    write_results(path, RESULTS)
    assert read_back(path) == [
        {"name": "test_login", "status": "passed", "duration": "1.25"},
        {"name": "test_cart, guest", "status": "failed", "duration": "3.4"},
    ]


def test_quotes_value_with_comma(tmp_path):
    """Значення з комою csv сам бере в лапки."""
    path = tmp_path / "results.csv"
    write_results(path, RESULTS)
    assert '"test_cart, guest",failed,3.4' in path.read_text(encoding="utf-8")


def test_empty_results(tmp_path):
    path = tmp_path / "results.csv"
    write_results(path, [])
    assert read_back(path) == []
