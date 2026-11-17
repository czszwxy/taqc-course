from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator

from security import hash_password

app = FastAPI(title="Gadget shop: accounts")

USERS: dict[int, dict] = {}


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=50)

    @field_validator("email")
    @classmethod
    def lower_email(cls, value: str) -> str:
        return value.lower()


class UserOut(BaseModel):
    id: int
    email: str
    name: str


@app.post("/users", status_code=201)
def create_user(user: UserCreate) -> UserOut:
    new_id = len(USERS) + 1
    USERS[new_id] = {"id": new_id, "email": user.email, "name": user.name, "password_hash": hash_password(user.password)}
    return USERS[new_id]


@app.get("/users/{user_id}")
def get_user(user_id: int) -> UserOut:
    if user_id not in USERS:
        raise HTTPException(status_code=404, detail="User not found")
    return USERS[user_id]
