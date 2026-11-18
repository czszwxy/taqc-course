from dataclasses import dataclass


@dataclass(frozen=True)
class Product:
    sku: str
    name: str
    price: int


def import_products(rows, known_skus=set()):
    products = []
    errors = []
    for index, row in enumerate(rows):
        line = index + 1
        try:
            sku = row["sku"].strip()
            name = row["name"].strip()
            price = int(row["price"])
            if not sku or not name or price <= 0:
                raise ValueError("empty field or bad price")
        except (KeyError, ValueError, AttributeError):
            errors.append(f"line {line}: invalid row")
            continue
        if sku in known_skus:
            errors.append(f"line {line}: duplicate SKU {sku}")
            continue
        known_skus.add(sku)
        products.append(Product(sku, name, price))
    return products, errors
