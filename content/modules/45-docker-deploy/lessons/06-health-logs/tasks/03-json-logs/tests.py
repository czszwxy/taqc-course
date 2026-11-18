import io
import json
import logging
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from solution import JsonFormatter

PAID_AT = datetime(2026, 11, 17, 9, 30, 0, 250000, tzinfo=UTC).timestamp()


class FixedTime(logging.Filter):
    def filter(self, record):
        record.created = PAID_AT
        return True


@pytest.fixture
def logged():
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    handler.addFilter(FixedTime())
    logger = logging.getLogger("shop.payments")
    logger.handlers = [handler]
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

    def lines():
        return stream.getvalue().splitlines()

    yield logger, lines
    logger.handlers = []


def entries(lines):
    return [json.loads(line) for line in lines()]


def test_example_from_statement(logged):
    """Приклад з умови: стандартні поля + extra, токен замасковано."""
    log, lines = logged
    log.info("Order %s paid", 1001, extra={"order_id": 1001, "card_token": "tok_42"})
    assert entries(lines) == [{
        "time": "2026-11-17T09:30:00.250+00:00",
        "level": "INFO",
        "logger": "shop.payments",
        "message": "Order 1001 paid",
        "order_id": 1001,
        "card_token": "***",
    }]


def test_one_line_per_record(logged):
    """Кожен запис — рівно один рядок, і це валідний JSON."""
    log, lines = logged
    log.info("first")
    log.warning("second")
    assert [entry["message"] for entry in entries(lines)] == ["first", "second"]
    assert [entry["level"] for entry in entries(lines)] == ["INFO", "WARNING"]


def test_no_internal_fields(logged):
    """Без extra — лише чотири ключі: службові атрибути запису (args, lineno, taskName…) не потрапляють."""
    log, lines = logged
    log.debug("cache warmed")
    assert set(entries(lines)[0]) == {"time", "level", "logger", "message"}


def test_time_is_utc_iso_with_milliseconds(logged):
    """time — UTC в ISO 8601 з мілісекундами."""
    log, lines = logged
    log.info("tick")
    assert entries(lines)[0]["time"] == "2026-11-17T09:30:00.250+00:00"


@pytest.mark.parametrize("key", ["password", "db_password", "API_TOKEN", "client_secret", "Refresh_Token"])
def test_sensitive_fields_masked(logged, key):
    """password / token / secret у назві, будь-який регістр — "***"."""
    log, lines = logged
    log.info("login", extra={key: "hunter2", "user_id": 42})
    entry = entries(lines)[0]
    assert entry[key] == "***"
    assert entry["user_id"] == 42
    assert "hunter2" not in lines()[0]


def test_unknown_types_as_strings(logged):
    """Decimal і datetime — рядком через str, а не помилка."""
    log, lines = logged
    log.info("refund", extra={"amount": Decimal("12.50"), "at": datetime(2026, 11, 17, 10, 0)})
    entry = entries(lines)[0]
    assert entry["amount"] == "12.50"
    assert entry["at"] == "2026-11-17 10:00:00"


def test_cyrillic_kept(logged):
    """Кирилиця лишається читабельною в самому рядку логу."""
    log, lines = logged
    log.info("Замовлення %s оплачено", 1001)
    assert "Замовлення 1001 оплачено" in lines()[0]


def test_exception_included(logged):
    """log.exception — поле exception з traceback, і все ще один рядок."""
    log, lines = logged
    try:
        1 / 0
    except ZeroDivisionError:
        log.exception("Refund failed", extra={"order_id": 7})
    assert len(lines()) == 1
    entry = entries(lines)[0]
    assert entry["level"] == "ERROR"
    assert entry["order_id"] == 7
    assert "ZeroDivisionError" in entry["exception"]
    assert entry["exception"].startswith("Traceback")


def test_no_exception_key_without_exc_info(logged):
    """Без exc_info ключа exception немає."""
    log, lines = logged
    log.error("Payment declined", extra={"order_id": 8})
    assert "exception" not in entries(lines)[0]


def test_format_returns_string():
    """format(record) повертає рядок (його пише handler)."""
    record = logging.LogRecord("shop", logging.INFO, __file__, 1, "Stock %s", ("low",), None)
    record.created = PAID_AT
    assert json.loads(JsonFormatter().format(record))["message"] == "Stock low"
