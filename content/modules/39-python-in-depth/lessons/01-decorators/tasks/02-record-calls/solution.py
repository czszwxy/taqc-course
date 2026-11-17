from functools import wraps


def record_calls(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        wrapper.calls.append((args, kwargs))
        return func(*args, **kwargs)

    wrapper.calls = []
    return wrapper
