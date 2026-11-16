from solution import error_endpoints


def test_example():
    lines = [
        "2026-11-02 10:15:01 GET /api/orders/1002 500 123ms",
        "2026-11-02 10:15:02 GET /api/orders/1001 503 98ms",
        "2026-11-02 10:15:03 POST /api/orders 201 45ms",
        "2026-11-02 10:15:04 GET /api/products?page=2 502 300ms",
    ]
    assert error_endpoints(lines) == [("GET /api/orders/{id}", 2), ("GET /api/products", 1)]


def test_ids_are_normalized():
    """/orders/1001 і /orders/1002 — той самий ендпоінт: заміни частини з цифр на {id}."""
    lines = [
        "2026-11-02 10:00:00 DELETE /api/orders/7/items/3 500 10ms",
        "2026-11-02 10:00:01 DELETE /api/orders/8/items/4 500 10ms",
    ]
    assert error_endpoints(lines) == [("DELETE /api/orders/{id}/items/{id}", 2)]


def test_only_5xx():
    """4xx — помилки клієнта, а не падіння сервера: рахуй лише статуси від 500."""
    lines = [
        "2026-11-02 10:00:00 GET /api/orders/1 404 5ms",
        "2026-11-02 10:00:01 GET /api/orders/1 499 5ms",
        "2026-11-02 10:00:02 GET /api/me 500 5ms",
    ]
    assert error_endpoints(lines) == [("GET /api/me", 1)]


def test_method_is_part_of_endpoint():
    lines = [
        "2026-11-02 10:00:00 GET /api/orders 500 5ms",
        "2026-11-02 10:00:01 POST /api/orders 500 5ms",
    ]
    assert error_endpoints(lines) == [("GET /api/orders", 1), ("POST /api/orders", 1)]


def test_sorted_by_count_then_name():
    """Більше помилок — вище; однакова кількість — за абеткою."""
    lines = [
        "2026-11-02 10:00:00 GET /api/z 500 5ms",
        "2026-11-02 10:00:01 GET /api/a 500 5ms",
        "2026-11-02 10:00:02 GET /api/m 500 5ms",
        "2026-11-02 10:00:03 GET /api/m 500 5ms",
    ]
    assert error_endpoints(lines) == [("GET /api/m", 2), ("GET /api/a", 1), ("GET /api/z", 1)]


def test_broken_lines_are_skipped():
    """Биті рядки (мало частин, статус не число) — пропусти, а не падай."""
    lines = [
        "",
        "garbage",
        "2026-11-02 10:00:00 GET /api/orders ERR 5ms",
        "2026-11-02 10:00:01 GET /api/orders 500 5ms",
    ]
    assert error_endpoints(lines) == [("GET /api/orders", 1)]


def test_no_errors():
    assert error_endpoints(["2026-11-02 10:00:00 GET /api/health 200 1ms"]) == []
