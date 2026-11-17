from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field

from repository import REPOSITORY, ProductRepository

app = FastAPI(title="Gadget shop: catalog")


class ProductIn(BaseModel):
    name: str
    price: int = Field(ge=1)


@app.get("/products")
def list_products():
    return REPOSITORY.all()


# твій код тут
