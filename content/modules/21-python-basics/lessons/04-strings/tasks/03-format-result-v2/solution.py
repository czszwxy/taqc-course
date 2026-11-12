def format_price(amount: int) -> str:
    grouped = f"{amount:,}".replace(",", " ")
    return f"{grouped} UAH"
