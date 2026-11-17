def find_key_paths(data, key, path=""):
    found = []
    if isinstance(data, dict):
        for name, value in data.items():
            current = f"{path}.{name}" if path else name
            if name == key:
                found.append(current)
            found.extend(find_key_paths(value, key, current))
    elif isinstance(data, list):
        for index, value in enumerate(data):
            found.extend(find_key_paths(value, key, f"{path}[{index}]"))
    return found
