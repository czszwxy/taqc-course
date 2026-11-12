def summary(results: list[str]) -> str:
    passed = 0
    failed = 0
    skipped = 0
    for result in results:
        if result == "passed":
            passed += 1
        elif result == "failed":
            failed =+ 1
        elif result == "skiped":
            skipped += 1
    return passed + " passed, " + str(failed) + " failed, " + str(skipped) + " skipped"
