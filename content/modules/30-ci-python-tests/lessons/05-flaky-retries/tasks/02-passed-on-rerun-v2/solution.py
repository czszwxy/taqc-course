def passed_on_rerun(attempts: list[dict]) -> list[str]:
    by_test = {}
    for attempt in attempts:
        by_test.setdefault(attempt["test"], []).append((attempt["attempt"], attempt["outcome"]))

    result = []
    for test, tries in by_test.items():
        tries.sort()
        first_outcome = tries[0][1]
        later_outcomes = [outcome for _number, outcome in tries[1:]]
        if first_outcome == "failed" and "passed" in later_outcomes:
            result.append(test)
    return sorted(result)
