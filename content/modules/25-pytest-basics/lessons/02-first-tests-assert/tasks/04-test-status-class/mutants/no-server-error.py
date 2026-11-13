def http_status_class(code: int) -> str:
    if 200 <= code <= 299:
        return "success"
    elif 300 <= code <= 399:
        return "redirect"
    elif 400 <= code <= 499:
        return "client error"
    return "unknown"
