def free_slots(busy, day_start, day_end):
    if day_start >= day_end:
        raise ValueError("the day must start before it ends")
    inside = sorted((max(start, day_start), min(end, day_end)) for start, end in busy if end > day_start and start < day_end)
    free = []
    cursor = day_start
    for start, end in inside:
        if start > cursor:
            free.append((cursor, start))
        cursor = max(cursor, end)
    if cursor < day_end:
        free.append((cursor, day_end))
    return free
