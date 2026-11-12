def top_slowest(times: list[int], n: int) -> list[int]:
    return sorted(times, reverse=True)[:n]
