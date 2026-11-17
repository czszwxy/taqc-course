from sqlalchemy import select

from models import Customer


def normalize(email):
    return email.strip().lower()


def register(session, email, name, city=None):
    customer = Customer(email=normalize(email), name=name, city=city)
    session.add(customer)
    session.commit()
    return customer


def get_by_email(session, email):
    return session.scalars(select(Customer).where(Customer.email == normalize(email))).first()


def active_in_city(session, city):
    stmt = select(Customer).where(Customer.city == city, Customer.is_active.is_(True)).order_by(Customer.name)
    return session.scalars(stmt).all()


def deactivate(session, customer_id):
    customer = session.get(Customer, customer_id)
    if customer is None:
        return False
    customer.is_active = False
    session.commit()
    return True
