import io
import logging

from solution import make_logger


def test_format_and_lazy_arguments():
    """Формат \"%(levelname)s %(name)s: %(message)s\"; аргументи підставляються в %s."""
    stream = io.StringIO()
    logger = make_logger("shop.orders", stream)
    logger.info("order %s paid", 1002)
    assert stream.getvalue() == "INFO shop.orders: order 1002 paid\n"


def test_default_level_is_info():
    """За замовчуванням level=logging.INFO: debug відкидається."""
    stream = io.StringIO()
    logger = make_logger("shop.default-level", stream)
    logger.debug("hidden")
    logger.warning("slow")
    assert stream.getvalue() == "WARNING shop.default-level: slow\n"


def test_custom_level():
    stream = io.StringIO()
    logger = make_logger("shop.debug", stream, level=logging.DEBUG)
    logger.debug("query took %sms", 12)
    assert stream.getvalue() == "DEBUG shop.debug: query took 12ms\n"


def test_returns_the_named_logger():
    logger = make_logger("shop.named", io.StringIO())
    assert logger is logging.getLogger("shop.named")


def test_second_call_replaces_the_handler():
    """logger.handlers.clear() перед addHandler: один обробник, новий потік, жодних подвійних рядків."""
    first = io.StringIO()
    second = io.StringIO()
    make_logger("shop.twice", first)
    logger = make_logger("shop.twice", second)
    logger.info("once")
    assert len(logger.handlers) == 1
    assert first.getvalue() == ""
    assert second.getvalue() == "INFO shop.twice: once\n"


def test_does_not_propagate():
    """logger.propagate = False — записи не дублюються в кореневому логері."""
    assert make_logger("shop.no-propagate", io.StringIO()).propagate is False
