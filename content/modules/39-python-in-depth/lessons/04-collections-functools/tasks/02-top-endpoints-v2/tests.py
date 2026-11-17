from solution import errors_by_path


def test_errors_are_grouped_in_order():
    lines = [
        "GET /api/orders 500 35ms",
        "GET /api/products 200 12ms",
        "POST /api/orders?retry=1 503 80ms",
        "GET /api/cart 404 3ms",
    ]
    assert errors_by_path(lines) == {"/api/orders": [500, 503], "/api/cart": [404]}


def test_paths_without_errors_are_not_included():
    """Звертайся до groups[path] лише для статусів >= 400 — інакше з'являться порожні списки."""
    lines = ["GET /api/products 200 12ms", "GET /api/products 304 2ms"]
    assert errors_by_path(lines) == {}


def test_statuses_are_numbers():
    """Статус з рядка — текст; перетвори його на int."""
    assert errors_by_path(["GET /x 418 1ms"]) == {"/x": [418]}


def test_four_hundred_is_an_error_three_ninety_nine_is_not():
    """Межа: помилка — статус від 400 включно."""
    lines = ["GET /a 400 1ms", "GET /b 399 1ms"]
    assert errors_by_path(lines) == {"/a": [400]}


def test_blank_lines_are_skipped():
    assert errors_by_path(["", "  ", "GET /a 500 1ms"]) == {"/a": [500]}


def test_result_is_a_plain_dict():
    """Поверни dict(groups), а не сам defaultdict."""
    assert type(errors_by_path(["GET /a 500 1ms"])) is dict
