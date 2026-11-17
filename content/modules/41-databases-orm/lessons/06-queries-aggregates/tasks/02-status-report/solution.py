from sqlalchemy import func, select

from models import Order


def status_report(session):
    stmt = select(Order.status, func.count(Order.id), func.sum(Order.total)).group_by(Order.status)
    return {status: (count, total) for status, count, total in session.execute(stmt).all()}
