from dataclasses import dataclass


@dataclass
class User:
    id: int
    email: str
    role: str = "customer"
    active: bool = True


class UserRepository:
    def __init__(self, users):
        self._users = users

    def __len__(self):
        return len(self._users)

    def __contains__(self, email):
        return self.find(email) is not None

    def find(self, email):
        wanted = email.strip().lower()
        for user in self._users:
            if user.email == wanted:
                return user
        return None

    def active(self):
        return [user for user in self._users if user.active]

    def count_by_role(self):
        counts = {}
        for user in self._users:
            counts[user.role] = counts.get(user.role, 0) + 1
        return counts
