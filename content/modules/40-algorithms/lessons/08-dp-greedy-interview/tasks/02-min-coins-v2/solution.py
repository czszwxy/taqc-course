def count_ways(amount, coins):
    ways = [1] + [0] * amount
    for coin in coins:
        for value in range(coin, amount + 1):
            ways[value] += ways[value - coin]
    return ways[amount]
