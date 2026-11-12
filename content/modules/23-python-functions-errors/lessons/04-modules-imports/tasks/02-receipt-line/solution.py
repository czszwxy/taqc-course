from money import format_uah


def receipt_line(name: str, price: int, qty: int) -> str:
    return f"{name} x{qty} = {format_uah(price * qty)}"
