def run_totals(results: list[str]) -> tuple:
    passed = 0
    failed = 0
    for result in results:
        if result == "passed":
            passed += 1
        elif result == "failed":
            failed += 1
    return len(results), passed, failed
