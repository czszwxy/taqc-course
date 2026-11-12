def top_rated(products: list[dict]) -> list[str]:
    ordered = sorted(products, key=lambda p: (-p["rating"], p["name"].lower()))
    return [p["name"] for p in ordered]
