from dataclasses import dataclass

ROLES = ("customer", "admin")


class InvalidUserError(Exception):
    """A user record from test data is broken."""


@dataclass
class User:
    id: int
    email: str
    role: str = "customer"
    active: bool = True


def user_from_dict(data: dict) -> User:
    for field in ("id", "email"):
        if field not in data:
            raise InvalidUserError(f"missing field: {field}")
    if not isinstance(data["id"], int):
        raise InvalidUserError("id must be an integer")
    email = str(data["email"]).strip().lower()
    if "@" not in email:
        raise InvalidUserError(f"invalid email: '{email}'")
    role = data.get("role", "customer")
    if role not in ROLES:
        raise InvalidUserError(f"unknown role: '{role}'")
    return User(id=data["id"], email=email, role=role, active=data.get("active", True))
