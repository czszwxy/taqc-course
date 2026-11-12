def pass_rate(results: list[str]) -> float:
    if not results:
        return 0.0
    passed = 0
    for result in results:
        if result == "passed":
            passed += 1
    return round(passed / len(results) * 100, 1)
