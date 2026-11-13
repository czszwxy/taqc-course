from pathlib import Path


def append_log(path: Path, message: str) -> None:
    with open(path, "a", encoding="utf-8") as f:
        f.write(message + "\n")
