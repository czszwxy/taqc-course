from pathlib import Path


def save_report(folder: Path, name: str, lines: list[str]) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{name}.txt"
    path.write_text("".join(line + "\n" for line in lines), encoding="utf-8")
    return path
