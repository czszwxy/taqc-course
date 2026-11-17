IMPOSSIBLE = float("inf")


def min_coins(amount, coins):
    best = [0] + [IMPOSSIBLE] * amount
    for value in range(1, amount + 1):
        for coin in coins:
            if coin <= value and best[value - coin] + 1 < best[value]:
                best[value] = best[value - coin] + 1
    return best[amount] if best[amount] != IMPOSSIBLE else -1
