def two_sum(prices, budget):
    first_index = {}
    for j, price in enumerate(prices):
        need = budget - price
        if need in first_index:
            return first_index[need], j
        first_index.setdefault(price, j)
    return None
