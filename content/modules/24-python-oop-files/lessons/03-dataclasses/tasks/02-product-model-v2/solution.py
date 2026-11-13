from dataclasses import dataclass


@dataclass
class User:
    id: int
    email: str
    first_name: str
    phone: str | None = None


def user_from_api(data: dict) -> User:
    return User(id=data["id"], email=data["email"], first_name=data["firstName"], phone=data.get("phone"))
