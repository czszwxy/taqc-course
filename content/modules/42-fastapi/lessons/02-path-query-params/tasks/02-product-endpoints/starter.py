from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, Query

from catalog import PRODUCTS

app = FastAPI(title="Gadget shop")


@app.get("/products")
def list_products():
    # твій код тут
    return PRODUCTS


@app.get("/products/{product_id}")
def get_product(product_id: int):
    # твій код тут
    pass
