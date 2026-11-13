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
    if page in PUBLIC_PAGES:
        return True
    if user is None or not user.active:
        return False
    return True
