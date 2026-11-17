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


@app.put("/cart/items/{product_id}")
def set_item(product_id: int, item: CartItemIn):
    product = find_product(product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if item.quantity > product["stock"]:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Only {product['stock']} left in stock")
    CART[product_id] = item.quantity
    return cart_view()


@app.delete("/cart/items/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(product_id: int):
    if product_id not in CART:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart")
    del CART[product_id]


@app.delete("/cart", status_code=status.HTTP_204_NO_CONTENT)
def clear_cart():
    CART.clear()
