from fastapi import FastAPI

from catalog import PRODUCTS

app = FastAPI(title="Gadget shop")


@app.get("/products")
def list_products():
    return PRODUCTS


@app.get("/products/count")
def count_products():
    return {"count": len(PRODUCTS)}


@app.get("/categories")
def list_categories():
    return sorted({product["category"] for product in PRODUCTS})


@app.get("/stats")
def stock_stats():
    in_stock = sum(1 for product in PRODUCTS if product["stock"] > 0)
    return {
        "in_stock": in_stock,
        "out_of_stock": len(PRODUCTS) - in_stock,
        "stock_value": sum(product["price"] * product["stock"] for product in PRODUCTS),
    }
