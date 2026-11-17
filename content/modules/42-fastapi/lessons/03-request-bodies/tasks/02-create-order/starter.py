from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from catalog import PRODUCTS

app = FastAPI(title="Gadget shop: orders")

ORDERS: dict[int, dict] = {}


class OrderItemIn(BaseModel):
    product_id: int
    quantity: int


# твій код тут
