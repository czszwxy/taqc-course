from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from security import ACCESS_TOKEN_MINUTES, ALGORITHM, SECRET_KEY, USERS, verify_password

app = FastAPI(title="Gadget shop: sign-in")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# твій код тут
