def json_paths(data, path: str = "$") -> dict:
    if not isinstance(data, (dict, list)) or not data:
        return {path: data}
    result = {}
    if isinstance(data, dict):
        for key, value in data.items():
            result.update(json_paths(value, f"{path}.{key}"))
    else:
        for index, item in enumerate(data):
            result.update(json_paths(item, f"{path}[{index}]"))
    return result
