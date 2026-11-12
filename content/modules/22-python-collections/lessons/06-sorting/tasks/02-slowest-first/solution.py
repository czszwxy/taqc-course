def slowest_first(results: list[tuple[str, float]]) -> list[tuple[str, float]]:
    return sorted(results, key=lambda r: (-r[1], r[0]))
