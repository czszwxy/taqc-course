def first_slow_index(times: list[int], limit: int) -> int:
    for index, t in enumerate(times):
        if t > limit:
            return index
    return -1
