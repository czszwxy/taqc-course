from fastapi import FastAPI

from catalog import PRODUCTS

app = FastAPI(title="Gadget shop")


@app.get("/products")
def list_products():
    return PRODUCTS


# твій код тут
