from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, Query

from catalog import PRODUCTS

app = FastAPI(title="Gadget shop")


@app.get("/products")
def list_products(
    category: str | None = None,
    max_price: Annotated[int | None, Query(ge=0)] = None,
    in_stock: bool = False,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
):
    found = PRODUCTS
    if category is not None:
        found = [p for p in found if p["category"] == category]
    if max_price is not None:
        found = [p for p in found if p["price"] <= max_price]
    if in_stock:
        found = [p for p in found if p["stock"] > 0]
    return found[:limit]


@app.get("/products/{product_id}")
def get_product(product_id: Annotated[int, Path(gt=0)]):
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
