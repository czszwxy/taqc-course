SILVER_FROM = 1000
GOLD_FROM = 5000


def discount_tier(subtotal: int) -> str:
    if subtotal < 0:
        return "invalid"
    if subtotal < SILVER_FROM:
        return "none"
    if subtotal < GOLD_FROM:
        return "silver"
    return "gold"
