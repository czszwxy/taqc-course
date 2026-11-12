def duplicates(items: list[str]) -> set[str]:
    seen = set()
    dups = set()
    for item in items:
        if item in seen:
            dups.add(item)
        seen.add(item)
    return dups
