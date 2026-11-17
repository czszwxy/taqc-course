from sqlalchemy import select

from models import User


class EmailTaken(Exception):
    pass


def normalize(email):
    return email.strip().lower()


class UserService:
    def __init__(self, session):
        self.session = session

    def register(self, email, name):
        email = normalize(email)
        if self.find(email) is not None:
            raise EmailTaken(email)
        user = User(email=email, name=name)
        self.session.add(user)
        self.session.commit()
        return user

    def find(self, email):
        return self.session.scalars(select(User).where(User.email == normalize(email))).first()

    def deactivate(self, email):
        user = self.find(email)
        if user is None:
            return False
        user.is_active = False
        return True

    def active_emails(self):
        stmt = select(User.email).where(User.is_active.is_(True)).order_by(User.email)
        return list(self.session.scalars(stmt).all())
