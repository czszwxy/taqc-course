def busiest_window(orders, k):
    if not 1 <= k <= len(orders):
        raise ValueError("k must be between 1 and the number of hours")
    window = sum(orders[:k])
    best_start, best_total = 0, window
    for start in range(1, len(orders) - k + 1):
        window += orders[start + k - 1] - orders[start - 1]
        if window > best_total:
            best_start, best_total = start, window
    return best_start, best_total
