from dataclasses import dataclass, field


@dataclass
class OrderItem:
    product_id: int
    price: int
    qty: int = 1


@dataclass
class Order:
    id: int
    items: list[OrderItem] = field(default_factory=list)
    discount: int = 0

    def add(self, item: OrderItem) -> None:
        self.items.append(item)

    def total(self) -> int:
        return max(sum(i.price * i.qty for i in self.items) - self.discount, 0)
