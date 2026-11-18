from dataclasses import dataclass


@dataclass(frozen=True)
class Product:
    sku: str
    name: str
    price: int


def import_products(rows, known_skus=None):
    seen = set(known_skus or ())
    products = []
    errors = []
    for index, row in enumerate(rows):
        line = index + 2
        try:
            sku = row["sku"].strip().upper()
            name = row["name"].strip()
            price = int(row["price"])
            if not sku or not name or price <= 0:
                raise ValueError("empty field or bad price")
        except (KeyError, ValueError, AttributeError):
            errors.append(f"line {line}: invalid row")
            continue
        if sku in seen:
            errors.append(f"line {line}: duplicate SKU {sku}")
            continue
        seen.add(sku)
        products.append(Product(sku, name, price))
    return products, errors
