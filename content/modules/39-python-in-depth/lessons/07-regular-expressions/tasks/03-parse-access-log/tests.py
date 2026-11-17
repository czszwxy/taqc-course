from solution import parse_line

LINE = '192.168.0.7 - [20/Mar/2026:10:15:02 +0200] "GET /api/orders?page=2 HTTP/1.1" 200 35ms'


def test_full_line():
    assert parse_line(LINE) == {
        "ip": "192.168.0.7",
        "method": "GET",
        "path": "/api/orders",
        "query": "page=2",
        "status": 200,
        "ms": 35,
    }


def test_without_query():
    """Немає ? — група query дає None; поверни \"\"."""
    line = '10.0.0.1 - [20/Mar/2026:10:15:03 +0200] "POST /api/orders HTTP/1.1" 201 80ms'
    result = parse_line(line)
    assert result["path"] == "/api/orders"
    assert result["query"] == ""
    assert result["method"] == "POST"


def test_numbers_are_ints():
    """status і ms перетвори на int."""
    result = parse_line(LINE)
    assert type(result["status"]) is int and type(result["ms"]) is int


def test_query_with_several_parameters_and_http2():
    line = '10.1.2.3 - [20/Mar/2026:11:00:00 +0200] "DELETE /api/orders/1002?force=true&reason=dup HTTP/2" 204 7ms'
    result = parse_line(line)
    assert (result["path"], result["query"], result["status"]) == ("/api/orders/1002", "force=true&reason=dup", 204)


def test_surrounding_whitespace_is_ignored():
    """line.strip() перед fullmatch."""
    assert parse_line("  " + LINE + "\n")["status"] == 200


def test_other_formats_give_none():
    """Не підійшло — None, без винятків."""
    assert parse_line("not a log line") is None
    assert parse_line(LINE.replace(" 35ms", "")) is None
    assert parse_line(LINE.replace(" 200 ", " 20 ")) is None
    assert parse_line("") is None
