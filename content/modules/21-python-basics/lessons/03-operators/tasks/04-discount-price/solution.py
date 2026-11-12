def price_after_discount(price: int, percent: int) -> int:
    return price * (100 - percent) // 100
