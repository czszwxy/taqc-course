from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, Query

from orders import ORDERS, OrderStatus

app = FastAPI(title="Gadget shop: orders")


@app.get("/orders")
def list_orders():
    # твій код тут
    return ORDERS


# твій код тут
