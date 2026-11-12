def with_prefix(names: list[str], prefix: str) -> list[str]:
    selected = []
    for name in names:
        if name.startswith(prefix):
            selected.append(name)
    return selected
