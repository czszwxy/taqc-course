def compare_ids(expected: list[int], actual: list[int]) -> tuple[set[int], set[int]]:
    expected_set = set(expected)
    actual_set = set(actual)
    return expected_set - actual_set, actual_set - expected_set
