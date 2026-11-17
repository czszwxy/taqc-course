from sqlalchemy import select

from models import Customer


def register(session, email, name, city=None):
    # твій код тут
    pass


def get_by_email(session, email):
    # твій код тут
    pass


def active_in_city(session, city):
    # твій код тут
    pass


def deactivate(session, customer_id):
    # твій код тут
    pass
