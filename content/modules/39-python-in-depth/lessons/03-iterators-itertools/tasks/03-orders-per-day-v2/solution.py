from itertools import groupby


def longest_run(values):
    best = None
    for value, group in groupby(values):
        length = len(list(group))
        if best is None or length > best[1]:
            best = (value, length)
    return best
