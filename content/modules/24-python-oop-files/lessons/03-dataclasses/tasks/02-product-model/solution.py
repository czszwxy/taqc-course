from dataclasses import dataclass


@dataclass
class Product:
    id: int
    name: str
    price: int
    in_stock: bool = True

    def discounted(self, percent: int) -> int:
        return round(self.price * (100 - percent) / 100)


def product_from_api(data: dict) -> Product:
    return Product(id=data["id"], name=data["name"], price=data["price"], in_stock=data.get("in_stock", True))
