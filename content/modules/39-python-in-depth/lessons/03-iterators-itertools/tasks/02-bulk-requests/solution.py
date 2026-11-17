from itertools import batched


def bulk_requests(ids, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return [{"ids": list(batch)} for batch in batched(ids, size)]
