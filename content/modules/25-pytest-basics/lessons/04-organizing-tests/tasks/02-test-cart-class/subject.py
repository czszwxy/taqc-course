class Cart:
    def __init__(self):
        self.items = {}  # name -> [price, qty]

    def add(self, name, price, qty=1):
        if name in self.items:
            self.items[name][1] += qty
        else:
            self.items[name] = [price, qty]

    def remove(self, name):
        del self.items[name]

    def count(self):
        return sum(qty for price, qty in self.items.values())

    def total(self):
        return sum(price * qty for price, qty in self.items.values())
