from dataclasses import dataclass
from datetime import datetime

MAX_PERCENT = 50


class PromoError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class Promo:
    code: str
    kind: str
    value: int
    min_subtotal: int = 0
    expires_at: datetime | None = None
    max_uses: int | None = None
    used: int = 0


@dataclass(frozen=True)
class Quote:
    subtotal: int
    discount: int
    total: int


def find_promo(promos, code):
    wanted = code.strip().upper()
    for promo in promos:
        if promo.code.upper() == wanted:
            return promo
    raise PromoError("unknown")


def quote(subtotal, promo, now):
    if promo is None:
        return Quote(subtotal, 0, subtotal)
    if promo.expires_at is not None and now >= promo.expires_at:
        raise PromoError("expired")
    if promo.max_uses is not None and promo.used > promo.max_uses:
        raise PromoError("used_up")
    if subtotal < promo.min_subtotal:
        raise PromoError("below_minimum")
    if promo.kind == "percent":
        discount = subtotal * min(promo.value, MAX_PERCENT) // 100
    elif promo.kind == "fixed":
        discount = min(promo.value, subtotal)
    else:
        raise ValueError(f"unknown promo kind: {promo.kind}")
    return Quote(subtotal, discount, subtotal - discount)
