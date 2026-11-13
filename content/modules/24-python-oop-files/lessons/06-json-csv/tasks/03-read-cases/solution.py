import csv
from pathlib import Path


def read_cases(path: Path) -> list[tuple[str, str, bool]]:
    with open(path, newline="", encoding="utf-8") as f:
        return [(row["email"], row["password"], row["should_pass"] == "yes") for row in csv.DictReader(f)]
