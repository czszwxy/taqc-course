def best_pair_within(prices, budget):
    left, right = 0, len(prices) - 1
    best = None
    while left < right:
        low, high = prices[left], prices[right]
        total = low + high
        if total > budget:
            right -= 1
        else:
            if best is None or total > best[0] + best[1]:
                best = (low, high)
            left += 1
    return best
