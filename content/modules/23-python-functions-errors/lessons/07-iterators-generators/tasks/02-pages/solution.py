def pages(items: list, size: int):
    for start in range(0, len(items), size):
        yield items[start:start + size]
