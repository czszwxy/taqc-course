def order_total(order: dict) -> int:
    subtotal = sum(item["price"] * item["qty"] for item in order["items"])
    return subtotal - order.get("discount", 0)
