import csv
from pathlib import Path

from models import User


class UserRepository:
    def __init__(self, users: list[User]):
        # твій код тут
        pass

    def find(self, email: str) -> User | None:
        pass

    def active(self) -> list[User]:
        pass

    def count_by_role(self) -> dict[str, int]:
        pass

    def export_csv(self, path: Path) -> None:
        pass
