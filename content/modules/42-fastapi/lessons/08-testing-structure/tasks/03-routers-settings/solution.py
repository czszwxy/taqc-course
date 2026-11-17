from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, status
from pydantic_settings import BaseSettings, SettingsConfigDict

from catalog import PRODUCTS


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SHOP_")

    shop_name: str = "Gadget shop"
    admin_key: str = "dev-admin-key"


@lru_cache
def get_settings() -> Settings:
    return Settings()


SettingsDep = Annotated[Settings, Depends(get_settings)]


def require_admin_key(settings: SettingsDep, x_admin_key: Annotated[str | None, Header()] = None) -> None:
    if x_admin_key != settings.admin_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")


def find_product(product_id: int) -> dict:
    if product_id not in PRODUCTS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return PRODUCTS[product_id]


products_router = APIRouter(prefix="/products", tags=["products"])


@products_router.get("")
def list_products():
    return [PRODUCTS[product_id] for product_id in sorted(PRODUCTS)]


@products_router.get("/{product_id}")
def get_product(product_id: int):
    return find_product(product_id)


admin_router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin_key)])


@admin_router.get("/stats")
def stats():
    return {"products": len(PRODUCTS), "stock": sum(p["stock"] for p in PRODUCTS.values())}


@admin_router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int):
    find_product(product_id)
    del PRODUCTS[product_id]


app = FastAPI(title="Gadget shop")
app.include_router(products_router)
app.include_router(admin_router)


@app.get("/info")
def info(settings: SettingsDep):
    return {"shop_name": settings.shop_name}
