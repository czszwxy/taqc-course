def all_in_stock(products: list[dict]) -> bool:
    return len(products) > 0 and all(p["in_stock"] for p in products)
