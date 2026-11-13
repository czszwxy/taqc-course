from dataclasses import dataclass

PUBLIC_PAGES = ("/", "/catalog", "/login")
ADMIN_PAGES = ("/admin", "/admin/users")


@dataclass
class User:
    id: int
    email: str
    role: str = "customer"
    active: bool = True


def can_open(user, page):
    if user is None:
        return False
    if page in PUBLIC_PAGES:
        return True
    if not user.active:
        return False
    if page in ADMIN_PAGES:
        return user.role == "admin"
    return True
