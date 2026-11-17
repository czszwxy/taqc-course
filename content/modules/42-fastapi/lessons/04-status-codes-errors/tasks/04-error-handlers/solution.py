from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import shop
from shop import CouponExpired, OutOfStock, ProductNotFound, ShopError

app = FastAPI(title="Gadget shop")

STATUS_BY_ERROR = {ProductNotFound: 404, OutOfStock: 409, CouponExpired: 400}


class OrderIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1)
    coupon: str | None = None


@app.get("/products/{product_id}")
def get_product(product_id: int):
    return shop.get_product(product_id)


@app.post("/orders", status_code=201)
def place_order(order: OrderIn):
    return shop.place_order(order.product_id, order.quantity, order.coupon)


@app.get("/reports/broken")
def broken_report():
    # A bug on purpose: the report reads a key that does not exist.
    return {"revenue": {}["total"]}


@app.exception_handler(ShopError)
async def shop_error(request: Request, exc: ShopError):
    return JSONResponse(status_code=STATUS_BY_ERROR.get(type(exc), 400), content={"error": exc.code, "message": str(exc)})


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"error": "internal_error", "message": "Something went wrong"})
