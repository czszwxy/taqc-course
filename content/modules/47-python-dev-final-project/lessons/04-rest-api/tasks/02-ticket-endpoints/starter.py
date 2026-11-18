from datetime import date
from typing import Literal

from fastapi import Depends, FastAPI, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from auth import User, get_current_user
from models import Ticket
from repairs import CUSTOMER, RepairError, Status, due_date, is_overdue, next_statuses
from repository import TicketRepository

engine = create_engine("sqlite:///repairs.db")
app = FastAPI(title="Gadgetly Repairs")


def get_session():
    with Session(engine) as session:
        yield session


def get_today():
    return date.today()


class TicketOut(BaseModel):
    id: int
    customer_email: str
    device: str
    problem: str
    priority: str
    status: str
    received_on: date
    due_on: date
    estimate_total: int | None
    version: int
    overdue: bool
    actions: list[str]


class TicketPage(BaseModel):
    items: list[TicketOut]
    total: int


# твій код тут: TicketIn, помилки, to_out, перевірка доступу і три ендпоінти
