def fastest_passed(results: list[tuple[str, str, float]]) -> str:
    best_name = ""
    best_time = None
    for name, status, duration in results:
        if status != "passed":
            continue
        if best_time is None or duration < best_time:
            best_time = duration
            best_name = name
    return best_name
