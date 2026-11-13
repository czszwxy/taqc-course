class Wishlist:
    def __init__(self, owner):
        self.owner = owner
        self.products = []

    def add(self, product):
        if product not in self.products:
            self.products.append(product)

    def remove(self, product):
        if product in self.products:
            self.products.remove(product)

    def count(self):
        return len(self.products)

    def has(self, product):
        return product.lower() in [p.lower() for p in self.products]
