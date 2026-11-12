def unit_price(total: str, quantity: str) -> float:
    return round(float(total) / int(quantity), 2)
