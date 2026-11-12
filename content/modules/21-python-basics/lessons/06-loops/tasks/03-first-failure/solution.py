def first_failed_index(results: list[str]) -> int:
    for index, result in enumerate(results):
        if result == "failed":
            return index
    return -1
