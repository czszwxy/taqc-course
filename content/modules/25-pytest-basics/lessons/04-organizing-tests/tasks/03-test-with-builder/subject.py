def order_total(order: dict) -> int:
    subtotal = sum(item["price"] * item["qty"] for item in order["items"])
    return max(subtotal - order.get("discount", 0), 0)
