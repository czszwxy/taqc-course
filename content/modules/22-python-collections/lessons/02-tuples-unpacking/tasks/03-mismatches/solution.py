def mismatches(expected: list[str], actual: list[str]) -> list[tuple[int, str, str]]:
    found = []
    for row, (exp, act) in enumerate(zip(expected, actual), start=1):
        if exp != act:
            found.append((row, exp, act))
    return found
