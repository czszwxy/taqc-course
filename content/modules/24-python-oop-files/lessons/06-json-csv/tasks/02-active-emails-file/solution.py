import json
from pathlib import Path


def load_active_emails(path: Path) -> list[str]:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return [u["email"].lower() for u in data["users"] if u["active"]]
