def unexpected_fields(allowed: list[str], response: dict) -> list[str]:
    extra = []
    for key in response:
        if key not in allowed:
            extra.append(key)
    return extra
