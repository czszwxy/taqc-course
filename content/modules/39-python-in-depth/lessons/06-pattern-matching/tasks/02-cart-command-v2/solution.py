def route(method, path):
    match method, path.strip("/").split("/"):
        case "GET", ["orders"]:
            return "list orders"
        case "POST", ["orders"]:
            return "create order"
        case "GET", ["orders", order_id] if order_id.isdigit():
            return f"get order {order_id}"
        case "DELETE", ["orders", order_id] if order_id.isdigit():
            return f"delete order {order_id}"
        case _, ["orders"]:
            return "405 method not allowed"
        case _, ["orders", order_id] if order_id.isdigit():
            return "405 method not allowed"
        case _:
            return "404 not found"
