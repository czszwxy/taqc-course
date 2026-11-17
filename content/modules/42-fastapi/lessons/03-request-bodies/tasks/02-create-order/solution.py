from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from catalog import PRODUCTS

app = FastAPI(title="Gadget shop: orders")

ORDERS: dict[int, dict] = {}


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=10)


class OrderIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    customer_email: EmailStr
    items: list[OrderItemIn] = Field(min_length=1, max_length=10)
    note: str | None = Field(default=None, max_length=200)


class OrderLineOut(BaseModel):
    product_id: int
    quantity: int
    unit_price: int
    line_total: int


class OrderOut(BaseModel):
    id: int
    customer_email: str
    items: list[OrderLineOut]
    total: int


def find_product(product_id: int) -> dict:
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return product


@app.post("/orders", status_code=201)
def create_order(order: OrderIn) -> OrderOut:
    lines = []
    for item in order.items:
        price = find_product(item.product_id)["price"]
        lines.append({"product_id": item.product_id, "quantity": item.quantity, "unit_price": price, "line_total": price * item.quantity})
    new_id = len(ORDERS) + 1
    ORDERS[new_id] = {
        "id": new_id,
        "customer_email": order.customer_email,
        "items": lines,
        "total": sum(line["line_total"] for line in lines),
        "note": order.note,
    }
    return ORDERS[new_id]


@app.get("/orders/{order_id}")
def get_order(order_id: int) -> OrderOut:
    if order_id not in ORDERS:
        raise HTTPException(status_code=404, detail="Order not found")
    return ORDERS[order_id]
