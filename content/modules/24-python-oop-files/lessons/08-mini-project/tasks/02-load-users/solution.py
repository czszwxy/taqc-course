import json
from pathlib import Path

from models import InvalidUserError, User, user_from_dict


def load_users(path: Path) -> tuple[list[User], list[str]]:
    with open(path, encoding="utf-8") as f:
        records = json.load(f)
    users = []
    errors = []
    seen = set()
    for number, record in enumerate(records, start=1):
        try:
            user = user_from_dict(record)
        except InvalidUserError as e:
            errors.append(f"record {number}: {e}")
            continue
        if user.email in seen:
            errors.append(f"record {number}: duplicate email '{user.email}'")
            continue
        seen.add(user.email)
        users.append(user)
    return users, errors
