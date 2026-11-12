def add_unique(items: list[str], item: str) -> list[str]:
    result = items.copy()
    if item not in result:
        result.append(item)
    return result
