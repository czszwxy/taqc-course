def response_stats(times: list[float]) -> tuple:
    if not times:
        return 0, 0, 0
    average = round(sum(times) / len(times), 1)
    return min(times), max(times), average
