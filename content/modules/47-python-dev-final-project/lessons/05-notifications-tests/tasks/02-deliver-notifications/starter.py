from sqlalchemy import select

from models import Notification


def deliver_pending(session, send, *, max_attempts=3):
    # твій код тут
    pass
