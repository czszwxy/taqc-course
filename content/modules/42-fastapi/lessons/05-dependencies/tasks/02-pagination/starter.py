import math
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, FastAPI, Query

from data import ORDERS, PRODUCTS

app = FastAPI(title="Gadget shop")


@dataclass
class Page:
    page: int
    size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


# твій код тут


@app.get("/products")
def list_products():
    return {"items": PRODUCTS}
