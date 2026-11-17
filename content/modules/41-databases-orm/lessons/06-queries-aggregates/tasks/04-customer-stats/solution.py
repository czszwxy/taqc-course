from sqlalchemy import func, select

from models import Customer, Order


def customer_stats(session):
    orders = func.count(Order.id)
    stmt = (
        select(Customer.email, orders, func.coalesce(func.sum(Order.total), 0))
        .outerjoin(Order, Order.customer_id == Customer.id)
        .group_by(Customer.id)
        .order_by(orders.desc(), Customer.email)
    )
    return [(email, count, total) for email, count, total in session.execute(stmt).all()]
