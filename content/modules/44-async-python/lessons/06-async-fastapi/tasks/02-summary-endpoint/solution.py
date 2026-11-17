import asyncio
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

from fakes import CatalogServices, NotFound

app = FastAPI(title="Gadget shop: catalog")

SERVICES = CatalogServices()


def get_services():
    return SERVICES


@app.get("/products/{sku}/summary")
async def product_summary(sku: str, services: Annotated[CatalogServices, Depends(get_services)]):
    try:
        price, stock = await asyncio.gather(services.price(sku), services.stock(sku))
    except NotFound:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"sku": sku, "price": price, "stock": stock, "available": stock > 0}
