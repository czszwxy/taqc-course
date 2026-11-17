from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import Base, Product

engine = create_engine("sqlite:///./shop.db")
Base.metadata.create_all(engine)

app = FastAPI(title="Gadget shop: catalog")


class ProductCreate(BaseModel):
    sku: str = Field(pattern=r"^[A-Z0-9-]{3,20}$")
    name: str = Field(min_length=2, max_length=100)
    price: int = Field(ge=1)
    stock: int = Field(default=0, ge=0)


# твій код тут
