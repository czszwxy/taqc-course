def total_price(price: str, quantity: str) -> float:
    total = float(price) * int(quantity)
    return round(total, 2)
