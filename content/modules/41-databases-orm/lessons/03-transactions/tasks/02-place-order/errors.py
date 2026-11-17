class OutOfStock(Exception):
    def __init__(self, product_id):
        super().__init__(f"product {product_id} is out of stock")
        self.product_id = product_id
