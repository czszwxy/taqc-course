class Inventory:
    def __init__(self):
        self._stock = {}

    def add(self, sku, qty):
        self._stock[sku] = self._stock.get(sku, 0) + qty

    def available(self, sku):
        return self._stock.get(sku, 0)

    def reserve(self, sku, qty):
        if qty > self.available(sku):
            raise ValueError(f"not enough {sku}: {self.available(sku)} left")
        self._stock[sku] -= qty
