import asyncio
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse

from checks import CHECKS

app = FastAPI(title="Gadget shop API")

CHECK_TIMEOUT_SECONDS = 1.0


def get_checks():
    return CHECKS


def get_check_timeout():
    return CHECK_TIMEOUT_SECONDS


# твій код тут
