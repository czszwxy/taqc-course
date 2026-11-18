from datetime import UTC, datetime

from promos import Promo

PRICES = {
    "MOUSE-01": 899,
    "KB-02": 1599,
    "CAM-01": 2499,
    "CABLE-03": 149,
}

PROMOS = [
    Promo("SPRING10", "percent", 10, min_subtotal=500, expires_at=datetime(2099, 1, 1, tzinfo=UTC)),
    Promo("MINUS200", "fixed", 200),
    Promo("WELCOME", "fixed", 300, max_uses=100, used=100),
]
