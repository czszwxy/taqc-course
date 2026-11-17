from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from tokens import ORDERS, TICKETS, TOKENS

app = FastAPI(title="Gadget shop: accounts")


@app.get("/admin/orders")
def admin_orders():
    return ORDERS


# твій код тут
