def group_queries(queries):
    groups = {}
    for query in queries:
        key = tuple(sorted(query.lower().split()))
        if not key:
            continue
        groups.setdefault(key, []).append(query)
    return list(groups.values())
