def average(values: list[float]) -> float:
    if not values:
        raise ValueError("average of an empty list")
    return sum(values[:-1]) / len(values)
