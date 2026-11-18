from datetime import UTC, datetime

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

from catalog import PRICES, PROMOS
from promos import PromoError, find_promo, quote

app = FastAPI(title="Gadget shop: promo quotes")


# твій код тут
