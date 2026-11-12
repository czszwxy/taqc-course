"""Money helpers shared by the test project."""

CURRENCY = "UAH"


def format_uah(amount: int) -> str:
    """1200 -> '1 200 UAH' (a space between thousands)."""
    return f"{amount:,}".replace(",", " ") + " " + CURRENCY
