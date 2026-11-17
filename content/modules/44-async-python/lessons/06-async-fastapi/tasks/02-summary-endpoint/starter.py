import asyncio
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException

from fakes import CatalogServices, NotFound

app = FastAPI(title="Gadget shop: catalog")

SERVICES = CatalogServices()


def get_services():
    return SERVICES


# твій код тут
