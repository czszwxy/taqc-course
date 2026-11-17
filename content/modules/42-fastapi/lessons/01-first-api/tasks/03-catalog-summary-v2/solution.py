from fastapi import FastAPI

from orders import ORDERS

app = FastAPI(title="Gadget shop: orders")

EARNING_STATUSES = ("paid", "shipped")


@app.get("/orders")
def list_orders():
    return ORDERS


@app.get("/statuses")
def list_statuses():
    return sorted({order["status"] for order in ORDERS})


@app.get("/revenue")
def revenue():
    active = [order for order in ORDERS if order["status"] != "cancelled"]
    earned = sum(order["total"] for order in ORDERS if order["status"] in EARNING_STATUSES)
    return {"orders": len(active), "revenue": earned}


@app.get("/customers/count")
def count_customers():
    return {"count": len({order["customer"] for order in ORDERS})}
