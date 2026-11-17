from solution import top_endpoints

LINES = [
    "GET /api/orders 200 35ms",
    "GET /api/products?page=2 200 12ms",
    "POST /api/orders 201 80ms",
    "",
    "GET /api/products 200 10ms",
    "GET /api/orders?status=paid 200 30ms",
]


def test_top_two():
    assert top_endpoints(LINES, 2) == [("/api/orders", 3), ("/api/products", 2)]


def test_method_is_ignored():
    """Рахуй лише шлях — другий елемент рядка; GET і POST на той самий шлях — одне й те саме."""
    lines = ["GET /api/cart 200 5ms", "DELETE /api/cart 204 7ms"]
    assert top_endpoints(lines, 1) == [("/api/cart", 2)]


def test_query_string_is_dropped():
    """/api/orders?page=2 і /api/orders — один ендпоінт: .split(\"?\")[0]."""
    lines = ["GET /api/orders?page=1 200 5ms", "GET /api/orders?page=2 200 5ms"]
    assert top_endpoints(lines, 5) == [("/api/orders", 2)]


def test_blank_lines_are_skipped():
    """Порожні рядки і рядки з пробілів пропускай: if line.strip()."""
    lines = ["   ", "GET /health 200 1ms", ""]
    assert top_endpoints(lines, 3) == [("/health", 1)]


def test_ties_keep_the_order_of_first_appearance():
    """Counter.most_common при рівній кількості зберігає порядок першої появи."""
    lines = ["GET /b 200 1ms", "GET /a 200 1ms", "GET /a 200 1ms", "GET /b 200 1ms"]
    assert top_endpoints(lines, 2) == [("/b", 2), ("/a", 2)]


def test_n_zero():
    assert top_endpoints(LINES, 0) == []
