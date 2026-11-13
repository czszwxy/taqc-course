from subject import http_status_class


def test_200_is_success():
    assert http_status_class(200) == "success"


def test_399_is_redirect():
    assert http_status_class(399) == "redirect"


def test_499_is_client_error():
    assert http_status_class(499) == "client error"


def test_500_is_server_error():
    assert http_status_class(500) == "server error"


def test_below_200_is_unknown():
    assert http_status_class(150) == "unknown"


def test_above_599_is_unknown():
    assert http_status_class(600) == "unknown"
