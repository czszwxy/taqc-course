from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

from catalog import PRICES, PROMOS
from promos import PromoError, find_promo, quote

app = FastAPI(title="Gadget shop: promo quotes")


class Line(BaseModel):
    sku: str
    quantity: int = Field(ge=1, le=99)


class QuoteRequest(BaseModel):
    items: list[Line] = Field(min_length=1)
    code: str | None = None


class QuoteResponse(BaseModel):
    subtotal: int
    discount: int
    total: int


def get_prices():
    return PRICES


def get_promos():
    return PROMOS


def get_now():
    return datetime.now(UTC)


@app.post("/quotes", response_model=QuoteResponse)
def create_quote(
    body: QuoteRequest,
    prices: Annotated[dict, Depends(get_prices)],
    promos: Annotated[list, Depends(get_promos)],
    now: Annotated[datetime, Depends(get_now)],
):
    subtotal = 0
    for line in body.items:
        if line.sku not in prices:
            raise HTTPException(status_code=400, detail={"error": "unknown_product", "sku": line.sku})
        subtotal += prices[line.sku] * line.quantity
    try:
        promo = find_promo(promos, body.code) if body.code and body.code.strip() else None
        result = quote(subtotal, promo, now)
    except PromoError as error:
        raise HTTPException(status_code=400, detail={"error": error.code}) from error
    return QuoteResponse(subtotal=result.subtotal, discount=result.discount, total=result.total)
