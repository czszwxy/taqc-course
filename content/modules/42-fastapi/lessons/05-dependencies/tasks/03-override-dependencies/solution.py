from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field

from repository import REPOSITORY, ProductRepository

app = FastAPI(title="Gadget shop: catalog")

NEW_FOR_DAYS = 7


class ProductIn(BaseModel):
    name: str
    price: int = Field(ge=1)


def get_repository() -> ProductRepository:
    return REPOSITORY


def get_now() -> datetime:
    return datetime.now(timezone.utc)


RepoDep = Annotated[ProductRepository, Depends(get_repository)]
NowDep = Annotated[datetime, Depends(get_now)]


@app.get("/products")
def list_products(repo: RepoDep):
    return repo.all()


@app.get("/products/new")
def new_products(repo: RepoDep, now: NowDep):
    today = now.date()
    return [p for p in repo.all() if (today - p["added"]).days <= NEW_FOR_DAYS]


@app.post("/products", status_code=201)
def add_product(product: ProductIn, repo: RepoDep, now: NowDep):
    return repo.add(product.name, product.price, added=now.date())
