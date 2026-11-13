import csv
from pathlib import Path

from models import User


class UserRepository:
    def __init__(self, users: list[User]):
        self._users = list(users)

    def __len__(self):
        return len(self._users)

    def __contains__(self, email):
        return self.find(email) is not None

    def find(self, email: str) -> User | None:
        wanted = email.strip().lower()
        for user in self._users:
            if user.email == wanted:
                return user
        return None

    def active(self) -> list[User]:
        return [user for user in self._users if user.active]

    def count_by_role(self) -> dict[str, int]:
        counts = {}
        for user in self._users:
            counts[user.role] = counts.get(user.role, 0) + 1
        return counts

    def export_csv(self, path: Path) -> None:
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["id", "email", "role", "active"])
            for user in self._users:
                writer.writerow([user.id, user.email, user.role, "yes" if user.active else "no"])
