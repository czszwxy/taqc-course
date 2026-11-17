import pytest

from solution import route


@pytest.mark.parametrize(
    "method, path, expected",
    [
        ("GET", "/orders", "list orders"),
        ("POST", "/orders", "create order"),
        ("GET", "/orders/1002", "get order 1002"),
        ("DELETE", "/orders/7", "delete order 7"),
    ],
)
def test_known_routes(method, path, expected):
    assert route(method, path) == expected


def test_trailing_slash_is_ignored():
    """path.strip(\"/\") прибирає слеші з обох кінців."""
    assert route("GET", "/orders/") == "list orders"


@pytest.mark.parametrize("method, path", [("PUT", "/orders"), ("PATCH", "/orders/1"), ("DELETE", "/orders")])
def test_wrong_method_on_a_known_path(method, path):
    """Відомий шлях, але інший метод — 405 (ці case стоять після конкретних маршрутів)."""
    assert route(method, path) == "405 method not allowed"


@pytest.mark.parametrize("method, path", [("GET", "/orders/abc"), ("GET", "/users"), ("GET", "/"), ("GET", "/orders/1/items")])
def test_unknown_paths(method, path):
    """Нецифровий id, інший ресурс або довший шлях — 404."""
    assert route(method, path) == "404 not found"
