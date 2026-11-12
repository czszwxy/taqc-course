def to_int_list(values: list[str]) -> list[int]:
    numbers = []
    for i, value in enumerate(values, start=1):
        try:
            numbers.append(int(value))
        except ValueError as e:
            raise ValueError(f"Item {i} is not a number: '{value}'") from e
    return numbers
