from sqlalchemy import update

from models import Notification, StatusChange, Ticket
from repairs import RepairError, Status, change_status


def move_ticket(session, ticket_id, new_status, *, role, version, today, estimate_total=None):
    # твій код тут
    pass
