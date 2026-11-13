MEMBER_PERCENT = 10
PROMO_CODES = {"SAVE5": 5, "SAVE20": 20}
PROMO_MIN_SUBTOTAL = 1000
MAX_PERCENT = 25


def discount_percent(subtotal: int, is_member: bool, promo: str | None = None) -> int:
    """Members get 10 %; a promo code adds its percent from 1000 UAH; never more than 25 %."""
    percent = MEMBER_PERCENT if is_member else 0
    if promo in PROMO_CODES and subtotal >= PROMO_MIN_SUBTOTAL:
        percent += PROMO_CODES[promo]
    return min(percent, MAX_PERCENT)
