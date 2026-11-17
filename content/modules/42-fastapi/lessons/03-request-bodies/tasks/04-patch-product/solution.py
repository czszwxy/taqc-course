from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from catalog import PRODUCTS

app = FastAPI(title="Gadget shop: catalog admin")


class ProductOut(BaseModel):
    id: int
    name: str
    price: int
    stock: int
    description: str | None


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2)
    price: int | None = Field(default=None, ge=1)
    stock: int | None = Field(default=None, ge=0)
    description: str | None = None


def find_product(product_id: int) -> dict:
    product = next((p for p in PRODUCTS if p["id"] == product_id), None)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.get("/products/{product_id}")
def get_product(product_id: int) -> ProductOut:
    return find_product(product_id)


@app.patch("/products/{product_id}")
def update_product(product_id: int, changes: ProductUpdate) -> ProductOut:
    product = find_product(product_id)
    product.update(changes.model_dump(exclude_unset=True))
    return product
