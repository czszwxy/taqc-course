from pathlib import Path


def failed_screenshots(folder: Path) -> list[str]:
    found = [p.relative_to(folder).as_posix() for p in folder.rglob("*.png") if "failed" in p.name]
    return sorted(found)
