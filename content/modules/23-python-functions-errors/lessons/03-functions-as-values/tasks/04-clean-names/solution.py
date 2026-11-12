def clean_names(names):
    normalized = map(str.lower, map(str.strip, names))
    return list(filter(lambda n: n != "", normalized))
