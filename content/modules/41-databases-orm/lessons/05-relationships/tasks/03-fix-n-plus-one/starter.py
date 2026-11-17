from sqlalchemy import select
from sqlalchemy.orm import selectinload

from models import Customer


def order_history(session):
    customers = session.scalars(select(Customer).order_by(Customer.email)).all()
    history = []
    for customer in customers:
        totals = [order.total for order in sorted(customer.orders, key=lambda order: order.id)]
        history.append((customer.email, totals))
    return history
