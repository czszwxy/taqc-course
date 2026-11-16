from collections import Counter


def normalize_path(path: str) -> str:
    path = path.split("?")[0]
    return "/".join("{id}" if part.isdigit() else part for part in path.split("/"))


def error_endpoints(lines: list[str]) -> list[tuple[str, int]]:
    counts = Counter()
    for line in lines:
        parts = line.split()
        if len(parts) < 6 or not parts[4].isdigit():
            continue
        method, path, status = parts[2], parts[3], int(parts[4])
        if status >= 500:
            counts[f"{method} {normalize_path(path)}"] += 1
    return sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
