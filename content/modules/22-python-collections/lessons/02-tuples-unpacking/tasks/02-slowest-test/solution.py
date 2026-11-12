def slowest(results: list[tuple[str, str, float]]) -> str:
    slowest_name = ""
    max_duration = -1.0
    for name, status, duration in results:
        if duration > max_duration:
            max_duration = duration
            slowest_name = name
    return slowest_name
