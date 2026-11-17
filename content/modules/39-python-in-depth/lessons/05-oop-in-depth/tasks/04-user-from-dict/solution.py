from dataclasses import dataclass

REQUIRED_FIELDS = ("id", "email")


@dataclass
class User:
    id: int
    email: str
    is_admin: bool = False

    @classmethod
    def from_dict(cls, data):
        for name in REQUIRED_FIELDS:
            if name not in data:
                raise ValueError(f"missing field: {name}")
        return cls(
            id=int(data["id"]),
            email=data["email"].strip().lower(),
            is_admin=bool(data.get("is_admin", False)),
        )

    def to_dict(self):
        return {"id": self.id, "email": self.email, "is_admin": self.is_admin}
