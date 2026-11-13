def parse_price(text: str) -> int:
    cleaned = text.replace("грн", "").replace(" ", "")
    if not cleaned.isdigit():
        raise ValueError(f"Invalid price: '{text}'")
    return int(cleaned)
