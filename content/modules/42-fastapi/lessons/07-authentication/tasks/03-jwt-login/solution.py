from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from security import ACCESS_TOKEN_MINUTES, ALGORITHM, SECRET_KEY, USERS, verify_password

app = FastAPI(title="Gadget shop: sign-in")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

BEARER = {"WWW-Authenticate": "Bearer"}


def create_access_token(username: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    return jwt.encode({"sub": username, "exp": expires}, SECRET_KEY, algorithm=ALGORITHM)


@app.post("/token")
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = USERS.get(form.username)
    if user is None or not verify_password(form.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password", headers=BEARER)
    return {"access_token": create_access_token(user["username"]), "token_type": "bearer"}


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    credentials_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers=BEARER)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.InvalidTokenError:
        raise credentials_error
    user = USERS.get(payload.get("sub"))
    if user is None:
        raise credentials_error
    return user


@app.get("/me")
def me(user: Annotated[dict, Depends(get_current_user)]):
    return {"username": user["username"], "full_name": user["full_name"]}
