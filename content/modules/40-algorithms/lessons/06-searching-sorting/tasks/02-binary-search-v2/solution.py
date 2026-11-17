def first_at_least(prices, minimum):
    low, high = 0, len(prices)
    while low < high:
        middle = (low + high) // 2
        if prices[middle] < minimum:
            low = middle + 1
        else:
            high = middle
    return low
