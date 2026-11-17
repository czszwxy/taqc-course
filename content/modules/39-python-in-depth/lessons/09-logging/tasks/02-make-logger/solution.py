import logging

LOG_FORMAT = "%(levelname)s %(name)s: %(message)s"


def make_logger(name, stream, level=logging.INFO):
    logger = logging.getLogger(name)
    logger.handlers.clear()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    logger.addHandler(handler)
    logger.setLevel(level)
    logger.propagate = False
    return logger
