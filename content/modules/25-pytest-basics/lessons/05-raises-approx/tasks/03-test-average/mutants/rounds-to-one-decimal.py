def average(values: list[float]) -> float:
    if not values:
        raise ValueError("average of an empty list")
    return round(sum(values) / len(values), 1)
