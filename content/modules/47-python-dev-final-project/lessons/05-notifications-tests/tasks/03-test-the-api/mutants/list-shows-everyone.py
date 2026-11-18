from datetime import date
from typing import Literal

from fastapi import Depends, FastAPI, Query, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from auth import User, get_current_user
from models import Ticket
from repairs import CUSTOMER, Part, RepairError, Status, due_date, estimate, is_overdue, next_statuses
from repository import TicketRepository
from services import move_ticket

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


class TicketIn(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    device: str = Field(min_length=2, max_length=60)
    problem: str = Field(min_length=5, max_length=500)
    priority: Literal["urgent", "normal", "low"] = "normal"


ERROR_STATUS = {
    "not_found": 404,
    "forbidden": 403,
    "invalid_transition": 409,
    "conflict": 409,
    "estimate_required": 409,
}


@app.exception_handler(RepairError)
def repair_error(request: Request, error: RepairError):
    return JSONResponse(status_code=ERROR_STATUS[error.code], content={"detail": {"error": error.code}})


def to_out(ticket, user, today):
    return TicketOut(
        id=ticket.id,
        customer_email=ticket.customer_email,
        device=ticket.device,
        problem=ticket.problem,
        priority=ticket.priority,
        status=ticket.status,
        received_on=ticket.received_on,
        due_on=ticket.due_on,
        estimate_total=ticket.estimate_total,
        version=ticket.version,
        overdue=is_overdue(ticket.due_on, today, ticket.status),
        actions=[status.value for status in next_statuses(ticket.status, user.role)],
    )


def visible_ticket(session, ticket_id, user):
    ticket = TicketRepository(session).get(ticket_id)
    if ticket is None or (user.role == CUSTOMER and ticket.customer_email != user.email):
        raise RepairError("not_found")
    return ticket


@app.post("/tickets", status_code=201, response_model=TicketOut)
def create_ticket(
    body: TicketIn,
    response: Response,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    today: date = Depends(get_today),
):
    if user.role != CUSTOMER:
        raise RepairError("forbidden")
    ticket = Ticket(
        customer_email=user.email,
        device=body.device,
        problem=body.problem,
        priority=body.priority,
        status=Status.RECEIVED.value,
        received_on=today,
        due_on=due_date(today, body.priority),
        version=1,
    )
    TicketRepository(session).add(ticket)
    session.commit()
    response.headers["Location"] = f"/tickets/{ticket.id}"
    return to_out(ticket, user, today)


@app.get("/tickets", response_model=TicketPage)
def list_tickets(
    status: Status | None = None,
    overdue: bool = False,
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    today: date = Depends(get_today),
):
    customer = None
    items, total = TicketRepository(session).search(
        customer=customer,
        status=status,
        overdue_on=today if overdue else None,
        limit=limit,
        offset=offset,
    )
    return TicketPage(items=[to_out(ticket, user, today) for ticket in items], total=total)


@app.get("/tickets/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    today: date = Depends(get_today),
):
    return to_out(visible_ticket(session, ticket_id, user), user, today)


class StatusIn(BaseModel):
    status: Status
    version: int


class PartIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    price: int = Field(ge=0)
    accidental: bool = False


class EstimateIn(BaseModel):
    parts: list[PartIn] = []
    labour_minutes: int = Field(ge=0, le=600)
    under_warranty: bool = False
    version: int


class ChangeOut(BaseModel):
    from_status: str
    to_status: str
    by_role: str
    changed_on: date


@app.post("/tickets/{ticket_id}/status", response_model=TicketOut)
def change_ticket_status(
    ticket_id: int,
    body: StatusIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    today: date = Depends(get_today),
):
    visible_ticket(session, ticket_id, user)
    ticket = move_ticket(session, ticket_id, body.status, role=user.role, version=body.version, today=today)
    return to_out(ticket, user, today)


@app.post("/tickets/{ticket_id}/estimate", response_model=TicketOut)
def send_estimate(
    ticket_id: int,
    body: EstimateIn,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
    today: date = Depends(get_today),
):
    visible_ticket(session, ticket_id, user)
    parts = [Part(part.name, part.price, part.accidental) for part in body.parts]
    result = estimate(parts, body.labour_minutes, body.under_warranty)
    ticket = move_ticket(
        session,
        ticket_id,
        Status.WAITING_APPROVAL,
        role=user.role,
        version=body.version,
        today=today,
        estimate_total=result.total,
    )
    return to_out(ticket, user, today)


@app.get("/tickets/{ticket_id}/history", response_model=list[ChangeOut])
def ticket_history(
    ticket_id: int,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    ticket = visible_ticket(session, ticket_id, user)
    return [
        ChangeOut(
            from_status=change.from_status,
            to_status=change.to_status,
            by_role=change.by_role,
            changed_on=change.changed_on,
        )
        for change in ticket.history
    ]
