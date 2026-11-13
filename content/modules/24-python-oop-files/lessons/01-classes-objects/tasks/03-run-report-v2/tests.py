from solution import RequestLog


def make_log():
    requests = RequestLog()
    requests.log("get", "/api/orders", 200)
    requests.log("POST", "/api/orders", 500)
    requests.log("GET", "/api/orders/7", 404)
    requests.log("get", "/api/products", 399)
    return requests


def test_count_ignores_case():
    """Метод зберігай у верхньому регістрі й порівнюй з method.upper()."""
    assert make_log().count("get") == 3
    assert make_log().count("POST") == 1


def test_errors():
    """Помилки — статуси від 400 (>= 400), формат "METHOD url -> status"."""
    assert make_log().errors() == ["POST /api/orders -> 500", "GET /api/orders/7 -> 404"]


def test_empty():
    assert RequestLog().errors() == []
    assert RequestLog().count("GET") == 0
