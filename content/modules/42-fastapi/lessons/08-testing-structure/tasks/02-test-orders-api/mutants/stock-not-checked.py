"""API замовлень, яке ти тестуєш (лише для читання)."""

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

app = FastAPI(title="Gadget shop: orders")

PRODUCTS = {
    1: {"name": "USB-C cable", "price": 299, "stock": 40},
    2: {"name": "Wireless mouse", "price": 899, "stock": 12},
    5: {"name": "27-inch monitor", "price": 8999, "stock": 5},
}
ORDERS: dict[int, dict] = {}


class OrderIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=10)


def find_order(order_id: int) -> dict:
    if order_id not in ORDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return ORDERS[order_id]


@app.post("/orders", status_code=status.HTTP_201_CREATED)
def create_order(data: OrderIn):
    product = PRODUCTS.get(data.product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    order_id = len(ORDERS) + 1
    ORDERS[order_id] = {
        "id": order_id,
        "product_id": data.product_id,
        "quantity": data.quantity,
        "total": product["price"] * data.quantity,
        "status": "new",
    }
    return ORDERS[order_id]


@app.get("/orders")
def list_orders(status: str | None = None):
    found = [ORDERS[order_id] for order_id in sorted(ORDERS)]
    if status is not None:
        found = [order for order in found if order["status"] == status]
    return found


@app.get("/orders/{order_id}")
def get_order(order_id: int):
    return find_order(order_id)


@app.post("/orders/{order_id}/ship")
def ship_order(order_id: int):
    order = find_order(order_id)
    if order["status"] != "new":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only new orders can be shipped")
    order["status"] = "shipped"
    return order


@app.post("/orders/{order_id}/cancel")
def cancel_order(order_id: int):
    order = find_order(order_id)
    if order["status"] != "new":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only new orders can be cancelled")
    order["status"] = "cancelled"
    return order
