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


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    name: str


class CustomerSummary(CustomerOut):
    orders_count: int
    orders_total: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    total: int


def get_session():
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


def find_customer(session: Session, customer_id: int) -> Customer:
    customer = session.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@app.post("/customers", status_code=status.HTTP_201_CREATED)
def create_customer(data: CustomerCreate, session: SessionDep) -> CustomerOut:
    customer = Customer(**data.model_dump())
    session.add(customer)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    session.refresh(customer)
    return customer


@app.get("/customers/{customer_id}")
def get_customer(customer_id: int, session: SessionDep) -> CustomerSummary:
    customer = find_customer(session, customer_id)
    return CustomerSummary(
        id=customer.id,
        email=customer.email,
        name=customer.name,
        orders_count=len(customer.orders),
        orders_total=sum(order.total for order in customer.orders),
    )


@app.post("/customers/{customer_id}/orders", status_code=status.HTTP_201_CREATED)
def create_order(customer_id: int, data: OrderCreate, session: SessionDep) -> OrderOut:
    find_customer(session, customer_id)
    order = Order(customer_id=customer_id, total=data.total)
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


@app.get("/customers/{customer_id}/orders")
def customer_orders(customer_id: int, session: SessionDep) -> list[OrderOut]:
    find_customer(session, customer_id)
    return session.scalars(select(Order).where(Order.customer_id == customer_id).order_by(Order.id)).all()
