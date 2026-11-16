import functools


def retry(times, exceptions=(Exception,)):
    if times < 1:
        raise ValueError(f"times must be at least 1, got {times}")

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for _attempt in range(times):
                try:
                    return func(*args, **kwargs)
                except exceptions as error:
                    last_error = error
            raise last_error

        return wrapper

    return decorator
