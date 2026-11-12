def remove_value(items: list[str], value: str) -> list[str]:
    kept = []
    for item in items:
        if item != value:
            kept.append(item)
    return kept
