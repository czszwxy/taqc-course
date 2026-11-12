def backoff(base: int, attempts: int, cap: int):
    delay = base
    for _ in range(attempts):
        yield min(delay, cap)
        delay *= 2
