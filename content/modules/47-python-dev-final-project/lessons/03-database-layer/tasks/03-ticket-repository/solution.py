from sqlalchemy import func, select

from models import Ticket
from repairs import CLOCK_RUNNING


class TicketRepository:
    def __init__(self, session):
        self.session = session

    def add(self, ticket):
        self.session.add(ticket)
        self.session.flush()
        return ticket

    def get(self, ticket_id):
        return self.session.get(Ticket, ticket_id)

    def search(self, *, customer=None, status=None, overdue_on=None, limit=20, offset=0):
        query = select(Ticket)
        if customer is not None:
            query = query.where(Ticket.customer_email == customer)
        if status is not None:
            query = query.where(Ticket.status == status)
        if overdue_on is not None:
            query = query.where(Ticket.due_on < overdue_on, Ticket.status.in_(CLOCK_RUNNING))
        total = self.session.scalar(select(func.count()).select_from(query.subquery()))
        page = query.order_by(Ticket.due_on, Ticket.id).limit(limit).offset(offset)
        return list(self.session.scalars(page)), total
