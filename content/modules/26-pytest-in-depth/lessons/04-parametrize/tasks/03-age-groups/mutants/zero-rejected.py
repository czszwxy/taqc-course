def age_group(age: int) -> str:
    if age <= 0:
        raise ValueError(f"age cannot be negative: {age}")
    if age <= 12:
        return "child"
    if age <= 17:
        return "teen"
    if age <= 64:
        return "adult"
    return "senior"
