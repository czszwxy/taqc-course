class NotEnoughPoints(Exception):
    def __init__(self, customer_id):
        super().__init__(f"customer {customer_id} has not enough points")
        self.customer_id = customer_id


class UnknownCustomer(Exception):
    def __init__(self, customer_id):
        super().__init__(f"customer {customer_id} does not exist")
        self.customer_id = customer_id
