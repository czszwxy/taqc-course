def count_files(folder, extension):
    suffix = extension.lower()
    count = 0
    for name, value in folder.items():
        if isinstance(value, dict):
            count += count_files(value, extension)
        elif name.lower().endswith(suffix):
            count += 1
    return count
