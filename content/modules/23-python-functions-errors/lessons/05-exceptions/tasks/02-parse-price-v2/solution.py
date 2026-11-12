MAX_PERCENT = 100


def parse_percent(text: str) -> int:
    cleaned = text.replace("%", "").strip()
    if not cleaned.isdigit() or int(cleaned) > MAX_PERCENT:
        raise ValueError(f"Invalid percent: '{text}'")
    return int(cleaned)
