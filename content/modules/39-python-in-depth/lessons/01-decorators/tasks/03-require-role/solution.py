from functools import wraps


def require_role(role):
    def decorator(func):
        @wraps(func)
        def wrapper(user, *args, **kwargs):
            if role not in user.get("roles", []):
                raise PermissionError(f"{role} role required")
            return func(user, *args, **kwargs)

        return wrapper

    return decorator
