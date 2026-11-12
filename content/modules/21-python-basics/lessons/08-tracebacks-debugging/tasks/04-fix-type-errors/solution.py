def order_summary(qty: str, price: str) -> str:
    total = int(qty) * int(price)
    return "Total: " + str(total) + " UAH"
