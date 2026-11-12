from solution import http_status_class


def test_success_boundaries():
    """2xx — від 200 до 299 включно."""
    assert http_status_class(200) == "success"
    assert http_status_class(299) == "success"


def test_redirect():
    assert http_status_class(301) == "redirect"


def test_client_error():
    """4xx — помилки клієнта: 400…499."""
    assert http_status_class(400) == "client error"
    assert http_status_class(404) == "client error"
    assert http_status_class(499) == "client error"


def test_server_error():
    assert http_status_class(500) == "server error"
    assert http_status_class(503) == "server error"


def test_unknown():
    """Усе поза 200–599 — unknown (199, 600, 0)."""
    assert http_status_class(199) == "unknown"
    assert http_status_class(600) == "unknown"
    assert http_status_class(0) == "unknown"
