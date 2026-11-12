def count_by_status(results: list[str]) -> dict[str, int]:
    counts = {}
    for status in results:
        counts[status] = counts.get(status, 0) + 1
    return counts
