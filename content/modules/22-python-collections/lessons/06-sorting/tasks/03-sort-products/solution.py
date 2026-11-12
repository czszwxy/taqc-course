def sort_products(products: list[dict]) -> list[str]:
    ordered = sorted(products, key=lambda p: (p["price"], p["name"].lower()))
    return [p["name"] for p in ordered]
