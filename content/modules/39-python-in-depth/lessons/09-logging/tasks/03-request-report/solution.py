FIRST_SERVER_ERROR = 500


def report(requests, logger, slow_ms=1000):
    problems = 0
    for request in requests:
        path, status, ms = request["path"], request["status"], request["ms"]
        if status >= FIRST_SERVER_ERROR:
            logger.error("%s failed with status %s", path, status)
            problems += 1
        elif ms >= slow_ms:
            logger.warning("%s is slow: %sms", path, ms)
            problems += 1
        else:
            logger.debug("%s ok in %sms", path, ms)
    return problems
