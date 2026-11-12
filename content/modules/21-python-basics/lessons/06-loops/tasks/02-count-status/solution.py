def count_status(results: list[str], status: str) -> int:
    count = 0
    for result in results:
        if result == status:
            count += 1
    return count
