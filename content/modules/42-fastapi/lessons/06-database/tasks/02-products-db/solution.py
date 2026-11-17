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


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    price: int
    stock: int


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


def find_product(session: Session, product_id: int) -> Product:
    product = session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@app.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(data: ProductCreate, session: SessionDep) -> ProductOut:
    product = Product(**data.model_dump())
    session.add(product)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
    session.refresh(product)
    return product


@app.get("/products")
def list_products(session: SessionDep, max_price: int | None = None) -> list[ProductOut]:
    query = select(Product).order_by(Product.id)
    if max_price is not None:
        query = query.where(Product.price <= max_price)
    return session.scalars(query).all()


@app.get("/products/{product_id}")
def get_product(product_id: int, session: SessionDep) -> ProductOut:
    return find_product(session, product_id)


@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, session: SessionDep):
    session.delete(find_product(session, product_id))
    session.commit()
