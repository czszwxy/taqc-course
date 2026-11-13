class Cart:
    def __init__(self):
        self.items = {}  # name -> [price, qty]

    def add(self, name, price, qty=1):
        self.items[name] = [price, qty]

    def remove(self, name):
        del self.items[name]

    def count(self):
        return sum(qty for price, qty in self.items.values())

    def total(self):
        return sum(price * qty for price, qty in self.items.values())
