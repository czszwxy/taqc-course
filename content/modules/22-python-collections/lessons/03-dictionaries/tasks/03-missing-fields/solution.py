def missing_fields(required: list[str], response: dict) -> list[str]:
    missing = []
    for field in required:
        if field not in response:
            missing.append(field)
    return missing
