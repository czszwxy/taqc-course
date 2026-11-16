def diff_json(expected, actual, path: str = "$") -> list[str]:
    if isinstance(expected, dict) and isinstance(actual, dict):
        differences = []
        for key, value in expected.items():
            if key not in actual:
                differences.append(f"{path}.{key}: missing")
            else:
                differences.extend(diff_json(value, actual[key], f"{path}.{key}"))
        for key in actual:
            if key not in expected:
                differences.append(f"{path}.{key}: unexpected")
        return differences

    if isinstance(expected, list) and isinstance(actual, list):
        differences = []
        if len(expected) != len(actual):
            differences.append(f"{path}: expected {len(expected)} items, got {len(actual)}")
        for index, (e, a) in enumerate(zip(expected, actual)):
            differences.extend(diff_json(e, a, f"{path}[{index}]"))
        return differences

    if type(expected) is not type(actual) or expected != actual:
        return [f"{path}: expected {expected!r}, got {actual!r}"]
    return []
