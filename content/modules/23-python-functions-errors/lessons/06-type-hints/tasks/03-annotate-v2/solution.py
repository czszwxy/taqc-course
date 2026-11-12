def average(values: list[float]) -> float | None:
    if not values:
        return None
    return sum(values) / len(values)


def find_user(users: list[dict], email: str) -> dict | None:
    for user in users:
        if user["email"] == email:
            return user
    return None


def tag_counts(tags: list[str]) -> dict[str, int]:
    counts = {}
    for tag in tags:
        counts[tag] = counts.get(tag, 0) + 1
    return counts
