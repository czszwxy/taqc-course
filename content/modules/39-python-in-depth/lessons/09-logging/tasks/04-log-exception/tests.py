import logging

from solution import charge_all


class ListHandler(logging.Handler):
    def __init__(self):
        super().__init__(level=logging.DEBUG)
        self.records = []

    def emit(self, record):
        self.records.append(record)


def capture(name):
    logger = logging.getLogger(f"tests.charge.{name}")
    logger.handlers.clear()
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    handler = ListHandler()
    logger.addHandler(handler)
    return logger, handler


def fake_charge(failing_ids):
    calls = []

    def charge(payment):
        calls.append(payment["id"])
        if payment["id"] in failing_ids:
            raise ConnectionError(f"gateway timeout for {payment['id']}")

    return charge, calls


PAYMENTS = [{"id": "p1"}, {"id": "p2"}, {"id": "p3"}]


def test_returns_successful_ids_and_continues_after_a_failure():
    """Невдала оплата не зупиняє решту: цикл іде далі."""
    logger, handler = capture("continue")
    charge, calls = fake_charge({"p2"})
    assert charge_all(PAYMENTS, charge, logger) == ["p1", "p3"]
    assert calls == ["p1", "p2", "p3"]


def test_records_and_levels():
    logger, handler = capture("levels")
    charge, calls = fake_charge({"p2"})
    charge_all(PAYMENTS, charge, logger)
    assert [(r.levelname, r.getMessage()) for r in handler.records] == [
        ("INFO", "payment p1 charged"),
        ("ERROR", "payment p2 failed"),
        ("INFO", "payment p3 charged"),
    ]


def test_failure_record_has_the_traceback():
    """logger.exception всередині except додає exc_info — тип винятку і traceback."""
    logger, handler = capture("traceback")
    charge, calls = fake_charge({"p1"})
    charge_all([{"id": "p1"}], charge, logger)
    (record,) = handler.records
    assert record.exc_info is not None
    assert record.exc_info[0] is ConnectionError


def test_messages_use_lazy_arguments():
    logger, handler = capture("lazy")
    charge, calls = fake_charge({"p2"})
    charge_all(PAYMENTS[:2], charge, logger)
    assert [r.msg for r in handler.records] == ["payment %s charged", "payment %s failed"]


def test_all_fail():
    logger, handler = capture("all-fail")
    charge, calls = fake_charge({"p1", "p2", "p3"})
    assert charge_all(PAYMENTS, charge, logger) == []
    assert len(handler.records) == 3
