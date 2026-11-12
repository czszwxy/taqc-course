def full_name(first, last, middle=None):
    if middle:
        return f"{first} {middle} {last}"
    return f"{first} {last}"


def pass_rate(results):
    if not results:
        return 0.0
    passed = results.count("passed")
    return round(passed / len(results) * 100, 1)


def index_by_id(users):
    return {user["id"]: user for user in users}
