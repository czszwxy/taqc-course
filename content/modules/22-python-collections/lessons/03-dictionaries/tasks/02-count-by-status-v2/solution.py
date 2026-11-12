def group_by_status(results: list[tuple[str, str]]) -> dict[str, list[str]]:
    groups = {}
    for name, status in results:
        groups.setdefault(status, []).append(name)
    return groups
