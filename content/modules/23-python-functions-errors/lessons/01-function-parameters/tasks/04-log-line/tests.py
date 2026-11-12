from solution import log_line


def test_parts_joined():
    """Числа теж частини повідомлення: str(p) перед join."""
    assert log_line("info", "user", 42, "logged in") == "[INFO] user 42 logged in"


def test_custom_separator():
    assert log_line("error", "GET", "/api/orders", 500, sep=" | ") == "[ERROR] GET | /api/orders | 500"


def test_level_only():
    """Без parts — лише рівень, без пробілу в кінці."""
    assert log_line("warn") == "[WARN]"


def test_single_part():
    assert log_line("debug", "start") == "[DEBUG] start"
