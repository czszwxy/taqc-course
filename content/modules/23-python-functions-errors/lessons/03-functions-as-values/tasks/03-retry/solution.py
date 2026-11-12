def retry(action, attempts):
    for attempt in range(1, attempts + 1):
        if action():
            return attempt
    return None
