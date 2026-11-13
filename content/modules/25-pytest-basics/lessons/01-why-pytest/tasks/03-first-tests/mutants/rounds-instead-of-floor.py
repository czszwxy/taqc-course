def discount_price(price: int, percent: int) -> int:
    """Price after a percent discount; the fractional part is dropped (rounded down)."""
    return round(price * (100 - percent) / 100)
