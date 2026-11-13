class FakeShopApi:
    """In-memory stand-in for the shop API used by the tests."""

    def __init__(self):
        self.orders = {}
        self._next_id = 1001

    def create_order(self, items):
        if not items:
            raise ValueError("an order needs at least one item")
        order_id = self._next_id
        self._next_id += 1
        self.orders[order_id] = {"id": order_id, "items": list(items), "status": "created"}
        return order_id

    def get_order(self, order_id):
        return self.orders.get(order_id)

    def pay(self, order_id):
        order = self.orders[order_id]
        order["status"] = "paid"

    def ship(self, order_id):
        order = self.orders[order_id]
        if order["status"] != "paid":
            raise ValueError(f"cannot ship an order in status {order['status']}")
        order["status"] = "shipped"

    def cancel(self, order_id):
        order = self.orders[order_id]
        if order["status"] == "shipped":
            raise ValueError("a shipped order cannot be cancelled")
        order["status"] = "cancelled"

    def delete_order(self, order_id):
        self.orders.pop(order_id, None)


API = FakeShopApi()
