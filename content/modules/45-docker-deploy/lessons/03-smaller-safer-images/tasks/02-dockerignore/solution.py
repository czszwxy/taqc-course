from fnmatch import fnmatchcase

ANY_FOLDERS = "**"


def parse_rules(dockerignore):
    """[(is_exception, pattern_parts)] in file order."""
    rules = []
    for raw in dockerignore.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        exception = line.startswith("!")
        if exception:
            line = line[1:].strip()
        line = line.strip("/")
        if not line or line == ".":
            continue
        rules.append((exception, line.split("/")))
    return rules


def match(pattern, parts):
    if not pattern:
        return not parts
    if pattern[0] == ANY_FOLDERS:
        return any(match(pattern[1:], parts[skip:]) for skip in range(len(parts) + 1))
    if not parts:
        return False
    return fnmatchcase(parts[0], pattern[0]) and match(pattern[1:], parts[1:])


def matches_path_or_parent(pattern, path):
    parts = path.split("/")
    return any(match(pattern, parts[:size]) for size in range(1, len(parts) + 1))


def is_excluded(path, dockerignore):
    excluded = False
    for exception, pattern in parse_rules(dockerignore):
        if matches_path_or_parent(pattern, path):
            excluded = not exception
    return excluded


def context_files(paths, dockerignore):
    return [path for path in paths if not is_excluded(path, dockerignore)]
