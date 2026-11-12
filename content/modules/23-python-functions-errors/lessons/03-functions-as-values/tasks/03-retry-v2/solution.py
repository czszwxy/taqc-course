def poll(get_status, expected, attempts):
    for call in range(1, attempts + 1):
        if get_status() == expected:
            return call
    return None
