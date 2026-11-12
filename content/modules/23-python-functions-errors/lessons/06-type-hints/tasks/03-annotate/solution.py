def full_name(first: str, last: str, middle: str | None = None) -> str:
    if middle:
        return f"{first} {middle} {last}"
    return f"{first} {last}"


def pass_rate(results: list[str]) -> float:
    if not results:
        return 0.0
    passed = results.count("passed")
    return round(passed / len(results) * 100, 1)


def index_by_id(users: list[dict]) -> dict[int, dict]:
    return {user["id"]: user for user in users}
