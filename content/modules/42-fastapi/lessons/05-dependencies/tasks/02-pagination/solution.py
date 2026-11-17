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


def pagination(
    page: Annotated[int, Query(ge=1)] = 1,
    size: Annotated[int, Query(ge=1, le=20)] = 5,
) -> Page:
    return Page(page=page, size=size)


PageDep = Annotated[Page, Depends(pagination)]


def paginate(items: list[dict], page: Page) -> dict:
    return {
        "items": items[page.offset : page.offset + page.size],
        "page": page.page,
        "size": page.size,
        "total": len(items),
        "pages": math.ceil(len(items) / page.size),
    }


@app.get("/products")
def list_products(page: PageDep):
    return paginate(PRODUCTS, page)


@app.get("/orders")
def list_orders(page: PageDep):
    return paginate(ORDERS, page)
