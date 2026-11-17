from typing import NotRequired, TypedDict


class OrderItem(TypedDict):
    sku: str
    quantity: int


class OrderPayload(TypedDict):
    id: int
    items: list[OrderItem]
    note: NotRequired[str]


def parse_item(index: int, item: object) -> OrderItem:
    if not isinstance(item, dict) or not isinstance(item.get("sku"), str):
        raise ValueError(f"item {index}: sku must be a string")
    quantity = item.get("quantity")
    if type(quantity) is not int or quantity < 1:
        raise ValueError(f"item {index}: quantity must be a positive integer")
    return {"sku": item["sku"], "quantity": quantity}


def parse_order(data: dict) -> OrderPayload:
    order_id = data.get("id")
    if type(order_id) is not int:
        raise ValueError("id must be an integer")
    items = data.get("items")
    if not isinstance(items, list) or not items:
        raise ValueError("items must be a non-empty list")
    payload: OrderPayload = {"id": order_id, "items": [parse_item(i, item) for i, item in enumerate(items)]}
    if "note" in data:
        if not isinstance(data["note"], str):
            raise ValueError("note must be a string")
        payload["note"] = data["note"]
    return payload
