from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models import Customer


def order_history(session):
    stmt = select(Customer).options(selectinload(Customer.orders)).order_by(Customer.email)
    customers = session.scalars(stmt).all()
    history = []
    for customer in customers:
        totals = [order.total for order in sorted(customer.orders, key=lambda order: order.id)]
        history.append((customer.email, totals))
    return history
