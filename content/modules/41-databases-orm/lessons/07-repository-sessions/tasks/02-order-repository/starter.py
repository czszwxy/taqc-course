from sqlalchemy import select

from errors import InvalidTransition, OrderNotFound
from models import Order


class OrderRepository:
    def __init__(self, session):
        self.session = session

    # твій код тут
