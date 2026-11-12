def slow_requests(times: list[int], limit: int) -> list[int]:
    slow = []
    for t in times:
        if t > limit:
            slow.append(t)
    return slow
