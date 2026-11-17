from sqlalchemy import select

from errors import InvalidTransition, OrderNotFound
from models import Order


class OrderRepository:
    def __init__(self, session):
        self.session = session

    def add(self, customer_email, total):
        order = Order(customer_email=customer_email, total=total)
        self.session.add(order)
        self.session.flush()
        return order

    def get(self, order_id):
        order = self.session.get(Order, order_id)
        if order is None:
            raise OrderNotFound(order_id)
        return order

    def list_by_status(self, status):
        return self.session.scalars(select(Order).where(Order.status == status).order_by(Order.id)).all()

    def mark_paid(self, order_id):
        order = self.get(order_id)
        if order.status != "new":
            raise InvalidTransition(order_id, order.status)
        order.status = "paid"
        return order
