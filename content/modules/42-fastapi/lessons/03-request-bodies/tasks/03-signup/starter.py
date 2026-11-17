from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator

from security import hash_password

app = FastAPI(title="Gadget shop: accounts")

USERS: dict[int, dict] = {}


class UserCreate(BaseModel):
    email: str
    password: str
    name: str


@app.post("/users", status_code=201)
def create_user(user: UserCreate):
    # твій код тут
    new_id = len(USERS) + 1
    USERS[new_id] = {"id": new_id, **user.model_dump()}
    return USERS[new_id]
