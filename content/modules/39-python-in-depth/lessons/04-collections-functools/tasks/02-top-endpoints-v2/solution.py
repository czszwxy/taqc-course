from collections import defaultdict

FIRST_ERROR_STATUS = 400


def errors_by_path(lines):
    groups = defaultdict(list)
    for line in lines:
        if not line.strip():
            continue
        method, path, status, duration = line.split()
        if int(status) >= FIRST_ERROR_STATUS:
            groups[path.split("?")[0]].append(int(status))
    return dict(groups)
