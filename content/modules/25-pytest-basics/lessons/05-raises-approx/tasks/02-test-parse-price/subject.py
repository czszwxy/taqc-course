def parse_price(text: str) -> int:
    cleaned = "".join(text.replace("грн", "").split())
    if not cleaned.isdigit():
        raise ValueError(f"Invalid price: '{text}'")
    return int(cleaned)
