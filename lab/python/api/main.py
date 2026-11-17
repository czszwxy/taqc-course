"""Your FastAPI practice app: change it, add endpoints, break it and fix it.

Start it from the project folder (no need to activate the venv):
    npm run lab:py-api                      this file, on http://127.0.0.1:8000
    npm run lab:py-api -- api/other.py      another file in lab/python/api
Then open http://127.0.0.1:8000/docs — Swagger UI lists every endpoint and has a "Try it out" button.
fastapi dev reloads the app on every save. Ctrl+C in the terminal stops it.
The data lives in memory: every restart starts from the two tickets below.
"""

from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, status
from pydantic import BaseModel, Field

app = FastAPI(title="Help desk (practice)")


class TicketIn(BaseModel):
    title: str = Field(min_length=3, max_length=80)
    priority: int = Field(default=3, ge=1, le=5)


class Ticket(TicketIn):
    id: int
    closed: bool = False


tickets: dict[int, Ticket] = {
    1: Ticket(id=1, title="Printer on floor 2 is offline", priority=2),
    2: Ticket(id=2, title="New laptop for Olena", priority=4),
}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/tickets")
def list_tickets(closed: bool | None = None) -> list[Ticket]:
    found = tickets.values() if closed is None else [t for t in tickets.values() if t.closed == closed]
    return sorted(found, key=lambda t: t.id)


@app.get("/tickets/{ticket_id}")
def get_ticket(ticket_id: Annotated[int, Path(gt=0)]) -> Ticket:
    if ticket_id not in tickets:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found")
    return tickets[ticket_id]


@app.post("/tickets", status_code=status.HTTP_201_CREATED)
def create_ticket(body: TicketIn) -> Ticket:
    ticket = Ticket(id=max(tickets, default=0) + 1, **body.model_dump())
    tickets[ticket.id] = ticket
    return ticket
