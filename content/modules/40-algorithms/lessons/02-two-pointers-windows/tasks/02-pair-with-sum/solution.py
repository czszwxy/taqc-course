def pair_with_sum(prices, budget):
    left, right = 0, len(prices) - 1
    while left < right:
        low, high = prices[left], prices[right]
        total = low + high
        if total == budget:
            return (low, high)
        if total < budget:
            left += 1
        else:
            right -= 1
    return None
