from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, Query

from orders import ORDERS, OrderStatus

app = FastAPI(title="Gadget shop: orders")


@app.get("/orders")
def list_orders(
    status: OrderStatus | None = None,
    min_total: Annotated[int | None, Query(ge=0)] = None,
    limit: Annotated[int, Query(ge=1, le=20)] = 5,
):
    found = sorted(ORDERS, key=lambda order: order["id"])
    if status is not None:
        found = [o for o in found if o["status"] == status]
    if min_total is not None:
        found = [o for o in found if o["total"] >= min_total]
    return found[:limit]


@app.get("/orders/{order_id}")
def get_order(order_id: Annotated[int, Path(gt=0)]):
    order = next((o for o in ORDERS if o["id"] == order_id), None)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.get("/customers/{email}/orders")
def customer_orders(email: str):
    return sorted((o for o in ORDERS if o["customer"] == email), key=lambda order: order["id"])
