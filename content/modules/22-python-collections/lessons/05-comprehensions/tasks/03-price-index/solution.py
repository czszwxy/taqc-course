def price_index(products: list[dict]) -> dict[int, int]:
    return {p["id"]: p["price"] for p in products if p["in_stock"]}
