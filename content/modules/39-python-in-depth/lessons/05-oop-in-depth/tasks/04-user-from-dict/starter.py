from dataclasses import dataclass


@dataclass
class User:
    id: int
    email: str
    is_admin: bool = False

    @classmethod
    def from_dict(cls, data):
        # твій код тут
        pass

    def to_dict(self):
        # твій код тут
        pass
