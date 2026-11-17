from collections.abc import Callable


def first[T](items: list[T]) -> T | None:
    return items[0] if items else None


def index_by[K, V](items: list[V], key: Callable[[V], K]) -> dict[K, V]:
    result: dict[K, V] = {}
    for item in items:
        item_key = key(item)
        if item_key in result:
            raise ValueError(f"duplicate key: {item_key!r}")
        result[item_key] = item
    return result
