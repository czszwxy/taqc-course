def count_slow(times: list[int], limit: int) -> int:
    count = 0
    for t in times:
        if t > limit:
            count += 1
    return count
