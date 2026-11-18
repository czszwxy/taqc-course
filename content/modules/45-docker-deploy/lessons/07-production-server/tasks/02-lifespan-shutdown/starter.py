import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

FLUSH_EVERY_SECONDS = 5.0


def create_app(database, flush_every=FLUSH_EVERY_SECONDS):
    # твій код тут
    pass
