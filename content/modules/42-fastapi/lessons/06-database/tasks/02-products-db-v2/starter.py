from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import create_engine, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import Base, Customer, Order

engine = create_engine("sqlite:///./shop.db")
Base.metadata.create_all(engine)

app = FastAPI(title="Gadget shop: customers")


class CustomerCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=60)


class OrderCreate(BaseModel):
    total: int = Field(ge=1)


# твій код тут
