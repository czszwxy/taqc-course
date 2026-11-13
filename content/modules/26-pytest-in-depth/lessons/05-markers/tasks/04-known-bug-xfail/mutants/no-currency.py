def format_price(amount: int) -> str:
    """Price for the UI with a space between thousands, e.g. 1 234 567 UAH.

    Known bug QA-17: in millions only the first separator becomes a space ("1 234,567 UAH").
    """
    return f"{amount:,}".replace(",", " ", 1)
