def make_order(**overrides):
    order = {"status": "created", "items": [], "discount": 0}
    order.update(overrides)
    return order
