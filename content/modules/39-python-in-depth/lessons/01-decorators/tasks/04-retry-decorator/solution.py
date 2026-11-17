from functools import wraps


def retry(times, exceptions=(Exception,)):
    if times < 1:
        raise ValueError("times must be at least 1")

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(1, times + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    if attempt == times:
                        raise

        return wrapper

    return decorator
