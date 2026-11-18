from sqlalchemy import func, select

from models import Ticket
from repairs import CLOCK_RUNNING


class TicketRepository:
    def __init__(self, session):
        self.session = session

    def add(self, ticket):
        # твій код тут
        pass

    def get(self, ticket_id):
        # твій код тут
        pass

    def search(self, *, customer=None, status=None, overdue_on=None, limit=20, offset=0):
        # твій код тут
        pass
