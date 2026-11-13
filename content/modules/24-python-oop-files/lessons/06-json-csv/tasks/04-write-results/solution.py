import csv
from pathlib import Path

FIELDS = ["name", "status", "duration"]


def write_results(path: Path, results: list[dict]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(results)
