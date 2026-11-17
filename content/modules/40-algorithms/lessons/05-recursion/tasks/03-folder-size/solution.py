def folder_size(folder):
    total = 0
    for value in folder.values():
        if isinstance(value, dict):
            total += folder_size(value)
        else:
            total += value
    return total
