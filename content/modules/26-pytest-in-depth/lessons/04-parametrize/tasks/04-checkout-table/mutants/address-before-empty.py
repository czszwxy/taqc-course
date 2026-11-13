MIN_ORDER = 100


def checkout_error(total: int, logged_in: bool, has_address: bool) -> str:
    if not logged_in:
        return "login required"
    if not has_address:
        return "address required"
    if total == 0:
        return "cart is empty"
    if total < MIN_ORDER:
        return f"minimum order is {MIN_ORDER}"
    return ""
