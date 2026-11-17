from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from catalog import PRODUCTS

app = FastAPI(title="Gadget shop: cart")

CART: dict[int, int] = {}


class CartItemIn(BaseModel):
    quantity: int = Field(ge=1)


def find_product(product_id: int) -> dict | None:
    return next((p for p in PRODUCTS if p["id"] == product_id), None)


def cart_view() -> dict:
    items = []
    for product_id in sorted(CART):
        product = find_product(product_id)
        items.append({"product_id": product_id, "name": product["name"], "quantity": CART[product_id], "line_total": product["price"] * CART[product_id]})
    return {"items": items, "total": sum(item["line_total"] for item in items)}


@app.get("/cart")
def get_cart():
    return cart_view()


# твій код тут
