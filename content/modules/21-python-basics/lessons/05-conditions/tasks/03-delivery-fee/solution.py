FREE_COURIER_FROM = 10000


def delivery_fee(subtotal: int, method: str):
    if method == "pickup":
        return 0
    if method == "post":
        return 70
    if method == "courier":
        if subtotal >= FREE_COURIER_FROM:
            return 0
        return 150
    return None
