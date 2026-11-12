def summary_line(product: str, qty: int, price: int) -> str:
    total = qty * price
    return product + " x" + str(qty) + " = " + str(total) + " UAH"
