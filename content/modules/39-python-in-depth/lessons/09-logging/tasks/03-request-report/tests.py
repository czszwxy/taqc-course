import logging

from solution import report


class ListHandler(logging.Handler):
    def __init__(self):
        super().__init__(level=logging.DEBUG)
        self.records = []

    def emit(self, record):
        self.records.append(record)


def capture(name):
    logger = logging.getLogger(f"tests.report.{name}")
    logger.handlers.clear()
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    handler = ListHandler()
    logger.addHandler(handler)
    return logger, handler


def lines(handler):
    return [(record.levelname, record.getMessage()) for record in handler.records]


REQUESTS = [
    {"path": "/api/orders", "status": 200, "ms": 35},
    {"path": "/api/checkout", "status": 502, "ms": 3000},
    {"path": "/api/search", "status": 200, "ms": 1500},
]


def test_one_record_per_request_at_the_right_level():
    """Статус >= 500 перевіряється першим: повільний 502 — це ERROR, а не WARNING."""
    logger, handler = capture("levels")
    report(REQUESTS, logger)
    assert lines(handler) == [
        ("DEBUG", "/api/orders ok in 35ms"),
        ("ERROR", "/api/checkout failed with status 502"),
        ("WARNING", "/api/search is slow: 1500ms"),
    ]


def test_returns_the_number_of_problems():
    logger, handler = capture("count")
    assert report(REQUESTS, logger) == 2


def test_boundaries():
    """Межі включно: status 500 — помилка, ms == slow_ms — повільний; 499 і 999 — ні."""
    logger, handler = capture("boundaries")
    requests = [
        {"path": "/a", "status": 500, "ms": 1},
        {"path": "/b", "status": 499, "ms": 1},
        {"path": "/c", "status": 200, "ms": 1000},
        {"path": "/d", "status": 200, "ms": 999},
    ]
    assert report(requests, logger) == 2
    assert [level for level, _ in lines(handler)] == ["ERROR", "DEBUG", "WARNING", "DEBUG"]


def test_custom_slow_threshold():
    logger, handler = capture("threshold")
    assert report([{"path": "/x", "status": 200, "ms": 250}], logger, slow_ms=200) == 1


def test_messages_use_lazy_arguments():
    """Передавай шаблон з %s і значення окремо — record.msg має бути шаблоном."""
    logger, handler = capture("lazy")
    report(REQUESTS, logger)
    assert [record.msg for record in handler.records] == [
        "%s ok in %sms",
        "%s failed with status %s",
        "%s is slow: %sms",
    ]


def test_no_requests():
    logger, handler = capture("empty")
    assert report([], logger) == 0
    assert handler.records == []
