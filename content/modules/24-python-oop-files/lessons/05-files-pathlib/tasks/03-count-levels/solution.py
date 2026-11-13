from pathlib import Path

LEVEL_POSITION = 2


def count_levels(path: Path) -> dict[str, int]:
    counts = {"ERROR": 0, "WARN": 0}
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.split()
            if len(parts) <= LEVEL_POSITION:
                continue
            level = parts[LEVEL_POSITION]
            if level in counts:
                counts[level] += 1
    return counts
