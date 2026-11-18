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
    # твій код тут
    pass


def quote(subtotal, promo, now):
    # твій код тут
    pass
