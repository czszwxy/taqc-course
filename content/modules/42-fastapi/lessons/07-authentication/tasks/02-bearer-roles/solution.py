from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from tokens import ORDERS, TICKETS, TOKENS

app = FastAPI(title="Gadget shop: accounts")
bearer = HTTPBearer()


def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)]) -> dict:
    user = TOKENS.get(credentials.credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[dict, Depends(get_current_user)]


def require_support(user: CurrentUser) -> dict:
    if user["role"] not in ("support", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Support staff only")
    return user


def require_admin(user: CurrentUser) -> dict:
    if user["role"] != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")
    return user


@app.get("/me")
def me(user: CurrentUser):
    return {"username": user["username"], "role": user["role"]}


@app.get("/support/tickets", dependencies=[Depends(require_support)])
def support_tickets():
    return TICKETS


@app.get("/admin/orders", dependencies=[Depends(require_admin)])
def admin_orders():
    return ORDERS
