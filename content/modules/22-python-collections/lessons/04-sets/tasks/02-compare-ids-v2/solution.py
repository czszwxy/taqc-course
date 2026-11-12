def added_removed(before: list[str], after: list[str]) -> tuple[list[str], list[str]]:
    before_set = set(before)
    after_set = set(after)
    return sorted(after_set - before_set), sorted(before_set - after_set)
