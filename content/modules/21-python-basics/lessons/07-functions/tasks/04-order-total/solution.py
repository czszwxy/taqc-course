def line_total(price: int, qty: int) -> int:
    return price * qty


def order_total(prices: list[int], quantities: list[int], discount: int = 0) -> int:
    total = 0
    for i in range(len(prices)):
        total += line_total(prices[i], quantities[i])
    return max(total - discount, 0)
