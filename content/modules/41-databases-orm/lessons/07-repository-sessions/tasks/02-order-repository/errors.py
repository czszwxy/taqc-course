class OrderNotFound(Exception):
    def __init__(self, order_id):
        super().__init__(f"order {order_id} not found")
        self.order_id = order_id


class InvalidTransition(Exception):
    def __init__(self, order_id, status):
        super().__init__(f"order {order_id} cannot be paid from status {status!r}")
        self.order_id = order_id
        self.status = status
