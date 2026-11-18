from dataclasses import dataclass

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from repairs import CUSTOMER, STAFF


@dataclass(frozen=True)
class User:
    email: str
    role: str


# Demo tokens. A real service would check a JWT or a session (module 42, lesson 7).
TOKENS = {
    "olena-token": User("olena@example.com", CUSTOMER),
    "taras-token": User("taras@example.com", CUSTOMER),
    "staff-token": User("service@example.com", STAFF),
}

bearer = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> User:
    if credentials is None or credentials.credentials not in TOKENS:
        raise HTTPException(status_code=401, detail="Not authenticated", headers={"WWW-Authenticate": "Bearer"})
    return TOKENS[credentials.credentials]
