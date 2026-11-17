from fastapi import FastAPI

from orders import ORDERS

app = FastAPI(title="Gadget shop: orders")


@app.get("/orders")
def list_orders():
    return ORDERS


# твій код тут
