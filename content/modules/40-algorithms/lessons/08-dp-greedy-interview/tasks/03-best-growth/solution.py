def best_growth(visits):
    lowest = None
    best = 0
    for visit in visits:
        if lowest is not None and visit - lowest > best:
            best = visit - lowest
        if lowest is None or visit < lowest:
            lowest = visit
    return best
