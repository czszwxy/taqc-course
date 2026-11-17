from contextlib import contextmanager


@contextmanager
def audit(log, action):
    log.append(f"start {action}")
    try:
        yield
    except Exception as error:
        log.append(f"fail {action}: {type(error).__name__}")
        raise
    else:
        log.append(f"ok {action}")
