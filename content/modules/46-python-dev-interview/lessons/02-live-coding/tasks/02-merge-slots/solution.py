DAY_MINUTES = 1440


def check_slot(start, end):
    if start < 0 or end > DAY_MINUTES or start >= end:
        raise ValueError(f"bad slot: ({start}, {end})")


def merge_slots(slots):
    for start, end in slots:
        check_slot(start, end)
    merged = []
    for start, end in sorted(slots):
        if merged and start <= merged[-1][1]:
            last_start, last_end = merged[-1]
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))
    return merged
