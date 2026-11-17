from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, status
from pydantic_settings import BaseSettings, SettingsConfigDict

from catalog import PRODUCTS

app = FastAPI(title="Gadget shop")


@app.get("/products")
def list_products():
    return [PRODUCTS[product_id] for product_id in sorted(PRODUCTS)]


# твій код тут
