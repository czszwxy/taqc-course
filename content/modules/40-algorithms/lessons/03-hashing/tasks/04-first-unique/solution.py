from collections import Counter


def first_unique(events):
    counts = Counter(events)
    for event in events:
        if counts[event] == 1:
            return event
    return None
